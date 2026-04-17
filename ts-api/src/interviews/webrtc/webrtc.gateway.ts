/**
 * WebRTC Gateway (Socket.IO)
 * File: ts-api/src/interviews/webrtc/webrtc.gateway.ts
 * 
 * Purpose: Handle real-time WebRTC signaling over Socket.IO
 * 
 * Events Handled:
 * - interview:join-room → user joins a room
 * - interview:offer → SDP offer relayed to remote peer
 * - interview:answer → SDP answer relayed to remote peer
 * - interview:ice-candidate → ICE candidate relayed
 * - interview:toggle-media → mic/cam/screen share toggles
 * - interview:chat-message → in-room text chat
 * - interview:leave-room → user leaves gracefully
 * - interview:end-room → host ends room for all
 * 
 * Architecture:
 * - Full-mesh WebRTC (each peer connects directly)
 * - Suitable for ≤6 participants
 * - For larger groups, integrate SFU (mediasoup, LiveKit)
 */

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
import { InterviewsService } from '../interviews.service';
import { WebRTCService } from './webrtc.service';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

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

type RoomMeta = {
  interviewId: string;
  roundId: string;
  hostUserId: string;
  endedAt: number | null;
};

// ──────────────────────────────────────────────────────────────────────────────
// WebRTC Gateway
// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 10_000,
  pingTimeout: 5_000,
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(WebRTCGateway.name);

  // roomId → Map<userId, RoomParticipant>
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();
  private readonly roomMeta = new Map<string, RoomMeta>();
  private readonly socketUsers = new Map<string, AuthUser>();
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly jwtService: JwtService,
    private readonly webrtcService: WebRTCService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Connection Lifecycle
  // ──────────────────────────────────────────────────────────────────────────

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

      // Verify JWT
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

      // Track all sockets for this user (reconnect handling)
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      this.logger.debug(
        `[${client.id}] Connected: ${user.id} (${user.role})`,
      );
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

    // Remove from all rooms
    for (const [roomId, participants] of this.rooms.entries()) {
      const participant = participants.get(user.id);
      if (participant && participant.socketId === client.id) {
        const activeSockets = this.userSockets.get(user.id);
        if (!activeSockets || activeSockets.size === 0) {
          participants.delete(user.id);
          client.to(roomId).emit('interview:user-left', { userId: user.id });
          this.emitRoomStatus(roomId);
          this.logger.debug(`[room:${roomId}] ${user.id} left (disconnect)`);

          if (participants.size === 0) {
            this.rooms.delete(roomId);
            this.roomMeta.delete(roomId);
            this.logger.debug(`[room:${roomId}] Empty — cleaned up`);
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Room Management
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; name?: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return this.sendError(client, 'Unauthenticated');

    const { roomId } = body;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate access
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      user.id,
      user.role,
    );

    if (!access.allowed) {
      const reason = access.reason === 'room_link_expired' ? 'Room link expired' : 'Access denied';
      return this.sendError(client, reason);
    }

    await client.join(roomId);

    // Create room if new
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

    // Store room metadata
    if (!this.roomMeta.has(roomId)) {
      this.roomMeta.set(roomId, {
        interviewId: access.interviewId!,
        roundId: access.roundId!,
        hostUserId: access.hostUserId!,
        endedAt: null,
      });
    }

    participants.set(user.id, participant);

    // Send room snapshot to joiner
    const allParticipants = Array.from(participants.values());
    client.emit('interview:room-snapshot', {
      participants: allParticipants.map((p) => this.serializeParticipant(p)),
    });

    // Notify others
    client.to(roomId).emit('interview:user-joined', {
      participant: this.serializeParticipant(participant),
    });

    this.emitRoomStatus(roomId);

    // Mark room started (for recruiter)
    if (user.role === 'recruiter' && access.interviewId && access.roundId) {
      await this.interviewsService.markRoomStarted(access.interviewId, access.roundId, user.id);
    }

    this.logger.log(
      `[room:${roomId}] ${user.id} (${user.role}) joined — ${participants.size} total`,
    );
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
      this.emitRoomStatus(roomId);

      if (participants.size === 0) {
        this.rooms.delete(roomId);
        this.roomMeta.delete(roomId);
      }
    }

    this.logger.debug(`[room:${roomId}] ${user.id} left voluntarily`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WebRTC Signaling Relay
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: RTCSessionDescriptionInit },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:offer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });

    this.logger.debug(
      `[room:${body.roomId}] Offer relayed ${user.id} → ${body.targetUserId}`,
    );
  }

  @SubscribeMessage('interview:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: RTCSessionDescriptionInit },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:answer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });

    this.logger.debug(
      `[room:${body.roomId}] Answer relayed ${user.id} → ${body.targetUserId}`,
    );
  }

  @SubscribeMessage('interview:ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:ice-candidate', {
      fromUserId: user.id,
      candidate: body.candidate,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Media State
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // Chat
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:chat-message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const msg = body.message?.trim();
    if (!msg || msg.length > 2000) return;

    const participants = this.rooms.get(body.roomId);
    const participant = participants?.get(user.id);

    this.server.to(body.roomId).emit('interview:chat-message', {
      userId: user.id,
      name: participant?.name ?? user.full_name ?? 'Participant',
      role: participant?.role ?? user.role,
      message: msg,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `[room:${body.roomId}] Chat: ${user.id}: ${msg.substring(0, 50)}...`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Room End
  // ──────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:end-room')
  async onEndRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const roomId = body?.roomId;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate access
    const access = await this.interviewsService.validateRoomAccessWithContext(
      roomId,
      user.id,
      user.role,
    );
    if (!access.allowed) {
      return this.sendError(client, 'Forbidden: cannot end room');
    }

    // Only recruiter (host) can end
    const meta = this.roomMeta.get(roomId);
    if (!meta || user.role !== 'recruiter' || user.id !== meta.hostUserId) {
      return this.sendError(client, 'Only host can end interview');
    }

    // Mark room as ended
    meta.endedAt = Date.now();

    // Notify all participants
    this.server.to(roomId).emit('interview:room-ended', {
      roomId,
      endedBy: user.id,
      endedAt: new Date().toISOString(),
    });

    // Mark ended in database
    await this.interviewsService.markRoomEnded(meta.interviewId, meta.roundId, user.id);

    // Disconnect all sockets from room
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(roomId);
        }
      }
    }

    // Cleanup
    this.rooms.delete(roomId);
    this.roomMeta.delete(roomId);

    this.logger.log(`[room:${roomId}] Room ended by ${user.id}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private getAuthUser(client: Socket): AuthUser | null {
    return (client as any).user as AuthUser | null;
  }

  private sendError(client: Socket, message: string): void {
    client.emit('interview:error', { message });
  }

  /**
   * Relay a message to a specific user in a room
   */
  private relayToUser(roomId: string, targetUserId: string, event: string, payload: unknown): void {
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

  private emitRoomStatus(roomId: string): void {
    const participants = this.rooms.get(roomId);
    const meta = this.roomMeta.get(roomId);
    const hostPresent = !!meta?.hostUserId && !!participants?.has(meta.hostUserId);

    this.server.to(roomId).emit('interview:room-status', {
      roomId,
      hostUserId: meta?.hostUserId ?? null,
      hostPresent,
      participantCount: participants?.size ?? 0,
      ended: !!meta?.endedAt,
      endedAt: meta?.endedAt ? new Date(meta.endedAt).toISOString() : null,
    });
  }

  private extractBearer(authHeader?: string): string | null {
    if (!authHeader) return null;
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    return m ? m[1] : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Admin Endpoints
  // ──────────────────────────────────────────────────────────────────────────

  getRoomInfo(roomId: string): Record<string, unknown> {
    const participants = this.rooms.get(roomId);
    return {
      roomId,
      participantCount: participants?.size ?? 0,
      participants: participants
        ? Array.from(participants.values()).map((p) => this.serializeParticipant(p))
        : [],
      meta: this.roomMeta.get(roomId),
    };
  }

  getAllRooms(): Record<string, unknown> {
    return {
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.keys()).map((roomId) => this.getRoomInfo(roomId)),
    };
  }
}