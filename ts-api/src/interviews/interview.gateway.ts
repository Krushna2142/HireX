/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Interview signaling + chat gateway.
 *
 * Client → Server events:
 *   interview:join-room      { roomId, userId, name?, role? }
 *   interview:offer          { roomId, targetUserId, sdp }
 *   interview:answer         { roomId, targetUserId, sdp }
 *   interview:ice-candidate  { roomId, targetUserId, candidate }
 *   interview:leave-room     { roomId }
 *   interview:toggle-media   { roomId, micOn?, camOn?, screenSharing? }
 *   interview:chat-message   { roomId, message }
 *
 * Server → Client events:
 *   interview:room-users
 *   interview:user-joined
 *   interview:user-left
 *   interview:offer
 *   interview:answer
 *   interview:ice-candidate
 *   interview:user-media-toggled
 *   interview:chat-message
 */

// ─── Payload types ────────────────────────────────────────────────────────────

type JoinPayload = {
  roomId: string;
  userId: string;
  name?: string;
  role?: 'candidate' | 'recruiter' | string;
};

type SessionDescriptionPayload = {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
};

type IceCandidatePayload = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

type SignalPayload = {
  roomId: string;
  targetUserId: string;
  sdp?: SessionDescriptionPayload;
  candidate?: IceCandidatePayload;
};

type TogglePayload = {
  roomId: string;
  micOn?: boolean;
  camOn?: boolean;
  screenSharing?: boolean; // ← new: tracks screen-share state for all peers
};

type ChatPayload = {
  roomId: string;
  message: string;
};

// ─── Room member ──────────────────────────────────────────────────────────────

type Member = {
  socketId: string;
  userId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean; // ← new
};

// ─── Gateway ──────────────────────────────────────────────────────────────────

@WebSocketGateway({
  namespace: '/interview',
  cors: { origin: true, credentials: true },
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InterviewGateway.name);

  /** roomId → userId → Member */
  private readonly rooms = new Map<string, Map<string, Member>>();

  /** socketId → { roomId, userId } */
  private readonly socketIndex = new Map<string, { roomId: string; userId: string }>();

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed) return;
    this.removeMember(indexed.roomId, indexed.userId, client.id);
  }

  // ── Room management ────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    if (!payload?.roomId || !payload?.userId) return;

    const roomId = payload.roomId.trim();
    const userId = payload.userId.trim();

    client.join(roomId);

    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Map());

    const members = this.rooms.get(roomId)!;
    members.set(userId, {
      socketId: client.id,
      userId,
      name: payload.name,
      role: payload.role,
      micOn: true,
      camOn: true,
      screenSharing: false,
    });

    this.socketIndex.set(client.id, { roomId, userId });

    // Send current members list to the joining user
    client.emit('interview:room-users', {
      roomId,
      users: Array.from(members.values()).map(this.memberToPublic),
    });

    // Broadcast new arrival to everyone else
    client.to(roomId).emit('interview:user-joined', {
      roomId,
      user: {
        userId,
        name: payload.name,
        role: payload.role,
        micOn: true,
        camOn: true,
        screenSharing: false,
      },
    });

    this.logger.log(`User ${userId} joined room ${roomId} (${members.size} total)`);
  }

  @SubscribeMessage('interview:leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed) return;
    if (body?.roomId && indexed.roomId !== body.roomId) return;
    this.removeMember(indexed.roomId, indexed.userId, client.id);
  }

  // ── WebRTC signaling (pure relay — no inspection needed) ───────────────────

  @SubscribeMessage('interview:offer')
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() payload: SignalPayload) {
    this.forwardSignal(client, 'interview:offer', payload);
  }

  @SubscribeMessage('interview:answer')
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() payload: SignalPayload) {
    this.forwardSignal(client, 'interview:answer', payload);
  }

  @SubscribeMessage('interview:ice-candidate')
  handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() payload: SignalPayload) {
    this.forwardSignal(client, 'interview:ice-candidate', payload);
  }

  // ── Media state ────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:toggle-media')
  handleToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TogglePayload,
  ) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed) return;

    const members = this.rooms.get(indexed.roomId);
    const me = members?.get(indexed.userId);
    if (!me) return;

    if (typeof payload.micOn === 'boolean')        me.micOn = payload.micOn;
    if (typeof payload.camOn === 'boolean')        me.camOn = payload.camOn;
    if (typeof payload.screenSharing === 'boolean') me.screenSharing = payload.screenSharing;

    // Broadcast updated state to everyone else in the room
    client.to(indexed.roomId).emit('interview:user-media-toggled', {
      roomId: indexed.roomId,
      userId: indexed.userId,
      micOn: me.micOn,
      camOn: me.camOn,
      screenSharing: me.screenSharing,
    });
  }

  // ── In-room chat ───────────────────────────────────────────────────────────

  @SubscribeMessage('interview:chat-message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatPayload,
  ) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed) return;

    const message = payload?.message?.trim();
    if (!message) return;

    const members = this.rooms.get(indexed.roomId);
    const me = members?.get(indexed.userId);

    const chatEvent = {
      roomId: indexed.roomId,
      userId: indexed.userId,
      name: me?.name ?? 'Participant',
      role: me?.role,
      message,
      timestamp: new Date().toISOString(),
    };

    // Echo to everyone in the room INCLUDING the sender
    this.server.to(indexed.roomId).emit('interview:chat-message', chatEvent);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private forwardSignal(client: Socket, event: string, payload: SignalPayload) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed || !payload?.roomId || !payload?.targetUserId) return;

    const members = this.rooms.get(payload.roomId);
    const target = members?.get(payload.targetUserId);
    if (!target) return;

    this.server.to(target.socketId).emit(event, {
      roomId: payload.roomId,
      fromUserId: indexed.userId,
      sdp: payload.sdp,
      candidate: payload.candidate,
    });
  }

  private removeMember(roomId: string, userId: string, socketId: string) {
    const members = this.rooms.get(roomId);
    if (!members) return;

    const existing = members.get(userId);
    if (!existing || existing.socketId !== socketId) return;

    members.delete(userId);
    this.socketIndex.delete(socketId);

    this.server.to(roomId).emit('interview:user-left', { roomId, userId });

    if (members.size === 0) this.rooms.delete(roomId);

    this.logger.log(`User ${userId} left room ${roomId}`);
  }

  private memberToPublic(m: Member) {
    return {
      userId: m.userId,
      name: m.name,
      role: m.role,
      micOn: m.micOn,
      camOn: m.camOn,
      screenSharing: m.screenSharing,
    };
  }
}