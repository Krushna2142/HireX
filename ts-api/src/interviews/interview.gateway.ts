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
 * Interview signaling gateway for WebRTC.
 *
 * Client -> Server:
 * - interview:join-room      { roomId, userId, name?, role? }
 * - interview:offer          { roomId, targetUserId, sdp }
 * - interview:answer         { roomId, targetUserId, sdp }
 * - interview:ice-candidate  { roomId, targetUserId, candidate }
 * - interview:leave-room     { roomId }
 * - interview:toggle-media   { roomId, micOn?, camOn? }
 *
 * Server -> Client:
 * - interview:room-users
 * - interview:user-joined
 * - interview:user-left
 * - interview:offer
 * - interview:answer
 * - interview:ice-candidate
 * - interview:user-media-toggled
 */

type JoinPayload = {
  roomId: string;
  userId: string;
  name?: string;
  role?: 'candidate' | 'recruiter' | string;
};

/**
 * IMPORTANT:
 * Do NOT use browser-only DOM types in Nest backend
 * (e.g. RTCSessionDescriptionInit, RTCIceCandidateInit).
 * Define JSON-compatible payload types instead.
 */
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
};

type Member = {
  socketId: string;
  userId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
};

@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(InterviewGateway.name);

  /** roomId -> userId -> Member */
  private readonly rooms = new Map<string, Map<string, Member>>();

  /** socketId -> { roomId, userId } */
  private readonly socketIndex = new Map<string, { roomId: string; userId: string }>();

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed) return;

    const { roomId, userId } = indexed;
    this.removeMember(roomId, userId, client.id);
  }

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
    });

    this.socketIndex.set(client.id, { roomId, userId });

    // Send current members to joiner
    client.emit('interview:room-users', {
      roomId,
      users: Array.from(members.values()).map((m) => ({
        userId: m.userId,
        name: m.name,
        role: m.role,
        micOn: m.micOn,
        camOn: m.camOn,
      })),
    });

    // Notify others
    client.to(roomId).emit('interview:user-joined', {
      roomId,
      user: {
        userId,
        name: payload.name,
        role: payload.role,
        micOn: true,
        camOn: true,
      },
    });

    this.logger.log(`User ${userId} joined room ${roomId}`);
  }

  @SubscribeMessage('interview:offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SignalPayload,
  ) {
    this.forwardSignal(client, 'interview:offer', payload);
  }

  @SubscribeMessage('interview:answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SignalPayload,
  ) {
    this.forwardSignal(client, 'interview:answer', payload);
  }

  @SubscribeMessage('interview:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SignalPayload,
  ) {
    this.forwardSignal(client, 'interview:ice-candidate', payload);
  }

  @SubscribeMessage('interview:toggle-media')
  handleToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TogglePayload,
  ) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed) return;

    const members = this.rooms.get(indexed.roomId);
    if (!members) return;

    const me = members.get(indexed.userId);
    if (!me) return;

    if (typeof payload.micOn === 'boolean') me.micOn = payload.micOn;
    if (typeof payload.camOn === 'boolean') me.camOn = payload.camOn;

    client.to(indexed.roomId).emit('interview:user-media-toggled', {
      roomId: indexed.roomId,
      userId: indexed.userId,
      micOn: me.micOn,
      camOn: me.camOn,
    });
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

  private forwardSignal(client: Socket, event: string, payload: SignalPayload) {
    const indexed = this.socketIndex.get(client.id);
    if (!indexed || !payload?.roomId || !payload?.targetUserId) return;

    const members = this.rooms.get(payload.roomId);
    if (!members) return;

    const target = members.get(payload.targetUserId);
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
}