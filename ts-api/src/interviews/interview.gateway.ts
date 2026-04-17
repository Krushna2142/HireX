/// <reference lib="dom" />
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InterviewsService } from './interviews.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string;
  role: string;
  full_name?: string;
};

type RoomParticipant = {
  userId: string;
  socketId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
};

type SDP = RTCSessionDescriptionInit;
type ICECandidate = RTCIceCandidateInit;

// ─────────────────────────────────────────────────────────────────────────────
// InterviewGateway
//
// Handles all WebRTC signaling for interview rooms:
//   - Authentication via JWT on connection
//   - Room join/leave with access validation
//   - SDP offer/answer relay
//   - ICE candidate relay
//   - Media state sync (mic/cam/screen)
//   - In-room text chat
//   - Reconnection handling (duplicate socket → same user)
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: true,          // Reflect request origin — lock down in production
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 10_000,
  pingTimeout: 5_000,
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(InterviewGateway.name);

  // roomId → Map<userId, RoomParticipant>
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();

  // socketId → AuthUser (for fast disconnect lookup)
  private readonly socketUsers = new Map<string, AuthUser>();

  // userId → Set<socketId> (for reconnection handling: one user may have multiple sockets briefly)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Connection lifecycle ───────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ||
        this.extractBearer(client.handshake.headers?.authorization as string | undefined);

      if (!token) {
        this.logger.warn(`[${client.id}] No auth token — disconnecting`);
        client.disconnect(true);
        return;
      }

      const decoded = await this.jwtService.verifyAsync<{
        sub?: string;
        id?: string;
        role: string;
        full_name?: string;
      }>(token);

      const user: AuthUser = {
        id: decoded.sub ?? decoded.id ?? '',
        role: decoded.role,
        full_name: decoded.full_name,
      };

      if (!user.id) {
        client.disconnect(true);
        return;
      }

      (client as any).user = user;
      this.socketUsers.set(client.id, user);

      // Track all sockets for this user (handles reconnect)
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      this.logger.debug(`[${client.id}] Connected: ${user.id} (${user.role})`);
    } catch (err) {
      this.logger.warn(`[${client.id}] Auth failed: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    this.socketUsers.delete(client.id);

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(user.id);
    }

    // Remove from all rooms this socket was in
    for (const [roomId, participants] of this.rooms.entries()) {
      const participant = participants.get(user.id);
      // Only remove if THIS socket was the active one for this user
      if (participant && participant.socketId === client.id) {
        // Check if user reconnected with a different socket already
        const activeSockets = this.userSockets.get(user.id);
        if (!activeSockets || activeSockets.size === 0) {
          participants.delete(user.id);
          client.to(roomId).emit('interview:user-left', { userId: user.id });
          this.logger.debug(`[room:${roomId}] ${user.id} left (disconnect)`);

          if (participants.size === 0) {
            this.rooms.delete(roomId);
            this.logger.debug(`[room:${roomId}] Empty — cleaned up`);
          }
        }
      }
    }
  }

  // ── Room management ────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; name?: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return this.sendError(client, 'Unauthenticated');

    const { roomId } = body;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate that this user has access to this room
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      user.id,
      user.role,
    );

    if (!access.allowed) {
      return this.sendError(client, 'Forbidden: you do not have access to this room');
    }

    await client.join(roomId);

    // Get or create room participant map
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    const participants = this.rooms.get(roomId)!;

    const participant: RoomParticipant = {
      userId: user.id,
      socketId: client.id,
      name: body.name ?? user.full_name,
      role: user.role,
      micOn: true,
      camOn: true,
      screenSharing: false,
      joinedAt: Date.now(),
    };

    participants.set(user.id, participant);

    // Send current participant list to the joiner
    const allParticipants = Array.from(participants.values());
    client.emit('interview:room-snapshot', {
      participants: allParticipants.map(p => this.serializeParticipant(p)),
    });

    // Notify existing participants
    client.to(roomId).emit('interview:user-joined', {
      participant: this.serializeParticipant(participant),
    });

    this.logger.log(`[room:${roomId}] ${user.id} (${user.role}) joined — ${participants.size} total`);
  }

  @SubscribeMessage('interview:leave-room')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const { roomId } = body;
    await client.leave(roomId);

    const participants = this.rooms.get(roomId);
    if (participants) {
      participants.delete(user.id);
      client.to(roomId).emit('interview:user-left', { userId: user.id });
      if (participants.size === 0) this.rooms.delete(roomId);
    }

    this.logger.debug(`[room:${roomId}] ${user.id} left voluntarily`);
  }

  // ── WebRTC signaling relay ─────────────────────────────────────────────────
  // These are pure relay events — the gateway never inspects SDP/ICE content.
  // It only validates auth and routes to the correct target socket.

  @SubscribeMessage('interview:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: SDP },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:offer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: SDP },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:answer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; candidate: ICECandidate },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:ice-candidate', {
      fromUserId: user.id,
      candidate: body.candidate,
    });
  }

  // ── Media state ────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:toggle-media')
  onToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: {
      roomId: string;
      micOn: boolean;
      camOn: boolean;
      screenSharing?: boolean;
    },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const participants = this.rooms.get(body.roomId);
    if (participants?.has(user.id)) {
      const p = participants.get(user.id)!;
      p.micOn = body.micOn;
      p.camOn = body.camOn;
      p.screenSharing = body.screenSharing ?? false;
    }

    client.to(body.roomId).emit('interview:user-media-toggled', {
      userId: user.id,
      micOn: body.micOn,
      camOn: body.camOn,
      screenSharing: body.screenSharing ?? false,
    });
  }

  // ── In-room chat ───────────────────────────────────────────────────────────

  @SubscribeMessage('interview:chat-message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const msg = body.message?.trim();
    if (!msg || msg.length > 2000) return; // Basic validation

    const participants = this.rooms.get(body.roomId);
    const participant = participants?.get(user.id);

    this.server.to(body.roomId).emit('interview:chat-message', {
      userId: user.id,
      name: participant?.name ?? user.full_name ?? 'Participant',
      role: participant?.role ?? user.role,
      message: msg,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Heartbeat / ping ───────────────────────────────────────────────────────

  @SubscribeMessage('interview:ping')
  onPing(@ConnectedSocket() client: Socket): void {
    client.emit('interview:pong', { ts: Date.now() });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private getAuthUser(client: Socket): AuthUser | null {
    return (client as any).user as AuthUser | null;
  }

  private sendError(client: Socket, message: string): void {
    client.emit('interview:error', { message });
  }

  /**
   * Relay a payload to a specific user in a room.
   * Finds the user's active socket by scanning the room adapter.
   */
  private relayToUser(
    roomId: string,
    targetUserId: string,
    event: string,
    payload: unknown,
  ): void {
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return;

    for (const socketId of roomSockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      const socketUser = socket ? this.socketUsers.get(socketId) : undefined;
      if (socketUser?.id === targetUserId && socket) {
        socket.emit(event, payload);
        return;
      }
    }
  }

  private serializeParticipant(p: RoomParticipant) {
    return {
      userId: p.userId,
      name: p.name,
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
      joinedAt: p.joinedAt,
    };
  }

  private extractBearer(authHeader?: string): string | null {
    if (!authHeader) return null;
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    return m ? m[1] : null;
  }

  // ── Room inspection (for admin/debugging) ─────────────────────────────────

  getRoomInfo(roomId: string) {
    const participants = this.rooms.get(roomId);
    return {
      roomId,
      participantCount: participants?.size ?? 0,
      participants: participants
        ? Array.from(participants.values()).map(p => this.serializeParticipant(p))
        : [],
    };
  }
}