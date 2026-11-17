/* eslint-disable prettier/prettier */
/**
 * WebRTC signaling gateway (Socket.IO, namespace "/interview")
 * File: ts-api/src/interviews/webrtc/webrtc.gateway.ts
 *
 * Media flows peer-to-peer (browser <-> browser). This gateway only:
 *   1. authenticates the socket (same rules as the REST guard),
 *   2. authorizes the user for the room (candidate / recruiter of that interview),
 *   3. tracks who is in the room and tells everyone,
 *   4. relays SDP offers/answers and ICE candidates to a specific peer,
 *   5. carries room events: media toggles, chat, recording status, transcript, end.
 *
 * Client -> server events (all take an ack callback)
 *   interview:join-room       { roomId, instanceId, micOn?, camOn? } -> JoinAck
 *   interview:leave-room      { roomId }
 *   interview:offer           { roomId, targetUserId, sdp }
 *   interview:answer          { roomId, targetUserId, sdp }
 *   interview:ice-candidate   { roomId, targetUserId, candidate }
 *   interview:toggle-media    { roomId, micOn?, camOn?, screenSharing? }
 *   interview:chat-message    { roomId, message, clientId }
 *   interview:recording-status{ roomId, recording }          (host only)
 *   interview:transcript      { roomId, text, ts }           (relayed to host only)
 *   interview:end-room        { roomId }                     (host only)
 *
 * Server -> client events
 *   interview:user-joined | interview:user-left | interview:user-connection
 *   interview:offer | interview:answer | interview:ice-candidate
 *   interview:user-media-toggled | interview:chat-message
 *   interview:recording-status | interview:transcript
 *   interview:session-replaced | interview:room-ended
 */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Namespace, Socket } from 'socket.io';
import { InterviewsService } from '../interviews.service';
import { InterviewRoomsService } from '../interview-rooms.service';
import { RealtimeAuthService, RealtimeUser } from '../realtime-auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Peer = {
  userId: string;
  socketId: string;
  instanceId: string;
  name: string;
  role: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
  connected: boolean;
  graceTimer?: NodeJS.Timeout;
};

type Room = {
  roomId: string;
  interviewId: string;
  roundId: string;
  hostUserId: string | null;
  peers: Map<string, Peer>;
  recording: boolean;
  startedAt: number;
};

type PublicPeer = Omit<Peer, 'socketId' | 'graceTimer' | 'instanceId'>;

type Ack<T = unknown> = ({ ok: true } & T) | { ok: false; code: string; message: string; [k: string]: unknown };

const NAMESPACE = '/interview';
/** How long a dropped socket keeps its seat before peers are told it left. */
const RECONNECT_GRACE_MS = 12_000;
const MAX_SDP_BYTES = 200_000;
const MAX_CHAT_CHARS = 4_000;
const CHAT_WINDOW_MS = 10_000;
const CHAT_MAX_PER_WINDOW = 20;
const ENDED_ROOM_TTL_MS = 10 * 60_000;

function allowedOrigins(): (string | RegExp)[] | boolean {
  const list = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ]
    .map((s) => (s ?? '').trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    list.push('http://localhost:3000', 'http://127.0.0.1:3000');
    // LAN testing (e.g. second laptop/phone on the same Wi-Fi)
    return [...list, /^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))[\d.]*:3000$/];
  }
  return list.length ? list : false;
}

const REJECT_MESSAGES: Record<string, string> = {
  invalid_room: 'This interview link is not valid.',
  room_not_found: 'This interview could not be found.',
  forbidden: 'You are not a participant of this interview.',
  room_not_open: 'The interview room is not open yet.',
  room_link_expired: 'This interview link has expired.',
  room_ended: 'This interview has already ended.',
};

@WebSocketGateway({
  namespace: NAMESPACE,
  cors: { origin: allowedOrigins(), credentials: true },
  // polling fallback keeps corporate proxies / flaky Wi-Fi working
  transports: ['websocket', 'polling'],
  pingInterval: 10_000,
  pingTimeout: 8_000,
  maxHttpBufferSize: 1e6,
})
export class WebRTCGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  /** With a namespaced gateway Nest injects the Namespace (not the root Server). */
  @WebSocketServer() server!: Namespace;
  private readonly logger = new Logger(WebRTCGateway.name);

  private readonly rooms = new Map<string, Room>();
  private readonly endedRooms = new Map<string, number>();
  private readonly chatWindow = new Map<string, number[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly auth: RealtimeAuthService,
    private readonly interviews: InterviewsService,
    private readonly roomsService: InterviewRoomsService,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Authenticate in a connection MIDDLEWARE, i.e. before the client is told it is connected.
   * (Doing this in handleConnection is racy: the client can emit `join-room` before the async
   * token/session lookup finishes, and would be rejected as "unauthorized" at random.)
   * A rejected handshake surfaces on the client as `connect_error` with message
   * "unauthorized: <reason>".
   */
  afterInit(server: Namespace) {
    server.use(async (socket, next) => {
      try {
        const raw =
          (socket.handshake.auth?.token as string | undefined) ||
          (socket.handshake.headers.authorization ?? '').replace(/^Bearer\s+/i, '') ||
          (socket.handshake.query?.token as string | undefined);
        if (!raw) throw new Error('missing token');

        socket.data.user = await this.auth.authenticate(raw.trim());
        next();
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'auth failed';
        this.logger.warn(`socket ${socket.id} rejected: ${reason}`);
        next(new Error(`unauthorized: ${reason}`));
      }
    });
  }

  handleConnection(client: Socket) {
    const user = client.data.user as RealtimeUser | undefined;
    this.logger.log(`socket ${client.id} connected: ${user?.email} (${user?.role})`);
  }

  handleDisconnect(client: Socket) {
    const roomId = client.data.roomId as string | undefined;
    const user = client.data.user as RealtimeUser | undefined;
    if (!roomId || !user) return;

    const room = this.rooms.get(roomId);
    const peer = room?.peers.get(user.id);
    // A newer socket already took over this seat -> nothing to do.
    if (!room || !peer || peer.socketId !== client.id) return;

    peer.connected = false;
    this.server.to(roomId).emit('interview:user-connection', {
      userId: user.id,
      connected: false,
    });

    peer.graceTimer = setTimeout(() => {
      this.removePeer(room, user.id, 'disconnected');
    }, RECONNECT_GRACE_MS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Join / leave
  // ───────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId?: string; instanceId?: string; micOn?: boolean; camOn?: boolean },
  ): Promise<Ack<Record<string, unknown>>> {
    const user = this.userOf(client);
    if (!user) return this.fail('unauthorized', 'Please sign in again.');

    const roomId = String(body?.roomId ?? '').trim();
    const instanceId = String(body?.instanceId ?? client.id);
    if (!roomId) return this.fail('invalid_room', REJECT_MESSAGES.invalid_room);

    this.pruneEndedRooms();
    if (this.endedRooms.has(roomId)) {
      return this.fail('room_ended', REJECT_MESSAGES.room_ended);
    }

    let access;
    try {
      access = await this.interviews.validateRoomAccessWithContext(roomId, user.id, user.role);
    } catch (err) {
      this.logger.error(`access check failed for ${roomId}`, err as Error);
      return this.fail('server_error', 'Could not verify access. Please retry.');
    }
    if (!access.allowed) {
      const code = access.reason ?? 'forbidden';
      return {
        ...this.fail(code, REJECT_MESSAGES[code] ?? 'Access denied.'),
        opensAt: (access as { opensAt?: string }).opensAt,
        scheduledAt: access.scheduledAt,
      };
    }

    // ── find / create the in-memory room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        interviewId: access.interviewId!,
        roundId: access.roundId!,
        hostUserId: access.hostUserId ?? null,
        peers: new Map(),
        recording: false,
        startedAt: Date.now(),
      };
      this.rooms.set(roomId, room);
    }

    // ── seat handling
    const existing = room.peers.get(user.id);
    const isResume = !!existing && existing.instanceId === instanceId;
    const isReplace = !!existing && !isResume;

    if (existing?.graceTimer) clearTimeout(existing.graceTimer);

    if (isReplace && existing) {
      // Same account opened the room somewhere else (new tab / reload): kick the old one
      // and make peers tear down the stale peer connection.
      this.server.to(existing.socketId).emit('interview:session-replaced', {
        message: 'You joined this interview from another tab or device.',
      });
      const oldSocket = this.server.sockets.get(existing.socketId);
      if (oldSocket) {
        oldSocket.data.roomId = undefined;
        void oldSocket.leave(roomId);
      }
      client.to(roomId).emit('interview:user-left', { userId: user.id, reason: 'replaced' });
    } else if (!existing) {
      const cap = this.config.get<number>('webrtc.maxParticipants') ?? 6;
      if (room.peers.size >= cap) {
        return this.fail('room_full', 'This room is full.');
      }
    }

    const peer: Peer = {
      userId: user.id,
      socketId: client.id,
      instanceId,
      name: user.fullName,
      role: user.role,
      micOn: body?.micOn ?? existing?.micOn ?? true,
      camOn: body?.camOn ?? existing?.camOn ?? true,
      screenSharing: isResume ? !!existing?.screenSharing : false,
      joinedAt: isResume && existing ? existing.joinedAt : Date.now(),
      connected: true,
    };
    room.peers.set(user.id, peer);

    client.data.roomId = roomId;
    await client.join(roomId);

    // ── notify others
    if (isResume) {
      this.server.to(roomId).emit('interview:user-connection', { userId: user.id, connected: true });
    } else {
      client.to(roomId).emit('interview:user-joined', { participant: this.pub(peer) });
    }

    // ── best-effort persistence / audit (never blocks signaling)
    if (!isResume) {
      void this.roomsService
        .joinRoom(roomId, user.id, user.role, user.fullName, instanceId)
        .catch((e) => this.logger.debug(`joinRoom persist skipped: ${e?.message ?? e}`));
      if (user.id === room.hostUserId) {
        void this.interviews
          .markRoomStarted(room.interviewId, room.roundId, user.id)
          .catch((e) => this.logger.debug(`markRoomStarted skipped: ${e?.message ?? e}`));
      }
    }

    this.logger.log(
      `${user.email} ${isResume ? 'resumed' : isReplace ? 'replaced seat in' : 'joined'} ${roomId} (${room.peers.size} in room)`,
    );

    return {
      ok: true,
      userId: user.id,
      role: user.role,
      isHost: user.id === room.hostUserId,
      hostUserId: room.hostUserId,
      recording: room.recording,
      resumed: isResume,
      iceServers: this.iceServers(),
      participants: [...room.peers.values()].map((p) => this.pub(p)),
      serverTime: Date.now(),
    };
  }

  @SubscribeMessage('interview:leave-room')
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId?: string }) {
    const ctx = this.ctxOf(client, body?.roomId);
    if (!ctx) return { ok: true };
    const { room, user } = ctx;
    const peer = room.peers.get(user.id);
    if (peer?.graceTimer) clearTimeout(peer.graceTimer);
    this.removePeer(room, user.id, 'left');
    client.data.roomId = undefined;
    await client.leave(room.roomId);
    return { ok: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Signaling relay
  // ───────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:offer')
  onOffer(@ConnectedSocket() c: Socket, @MessageBody() b: { roomId?: string; targetUserId?: string; sdp?: unknown }) {
    return this.relay(c, 'interview:offer', b, { sdp: b?.sdp }, true);
  }

  @SubscribeMessage('interview:answer')
  onAnswer(@ConnectedSocket() c: Socket, @MessageBody() b: { roomId?: string; targetUserId?: string; sdp?: unknown }) {
    return this.relay(c, 'interview:answer', b, { sdp: b?.sdp }, true);
  }

  @SubscribeMessage('interview:ice-candidate')
  onIce(@ConnectedSocket() c: Socket, @MessageBody() b: { roomId?: string; targetUserId?: string; candidate?: unknown }) {
    return this.relay(c, 'interview:ice-candidate', b, { candidate: b?.candidate }, false);
  }

  private relay(
    client: Socket,
    event: string,
    body: { roomId?: string; targetUserId?: string },
    payload: Record<string, unknown>,
    isSdp: boolean,
  ): Ack {
    const ctx = this.ctxOf(client, body?.roomId);
    if (!ctx) return this.fail('not_in_room', 'Join the room first.');
    const { room, user } = ctx;

    const target = body?.targetUserId ? room.peers.get(body.targetUserId) : undefined;
    if (!target || target.userId === user.id) {
      return this.fail('peer_unavailable', 'The other participant is not in the room.');
    }
    if (isSdp && JSON.stringify(payload.sdp ?? '').length > MAX_SDP_BYTES) {
      return this.fail('payload_too_large', 'Session description too large.');
    }
    this.server.to(target.socketId).emit(event, { ...payload, fromUserId: user.id });
    return { ok: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Room events
  // ───────────────────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:toggle-media')
  onToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() b: { roomId?: string; micOn?: boolean; camOn?: boolean; screenSharing?: boolean },
  ): Ack {
    const ctx = this.ctxOf(client, b?.roomId);
    if (!ctx) return this.fail('not_in_room', 'Join the room first.');
    const peer = ctx.room.peers.get(ctx.user.id);
    if (!peer) return this.fail('not_in_room', 'Join the room first.');

    if (typeof b.micOn === 'boolean') peer.micOn = b.micOn;
    if (typeof b.camOn === 'boolean') peer.camOn = b.camOn;
    if (typeof b.screenSharing === 'boolean') peer.screenSharing = b.screenSharing;

    client.to(ctx.room.roomId).emit('interview:user-media-toggled', {
      userId: peer.userId,
      micOn: peer.micOn,
      camOn: peer.camOn,
      screenSharing: peer.screenSharing,
    });
    return { ok: true };
  }

  @SubscribeMessage('interview:chat-message')
  async onChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() b: { roomId?: string; message?: string; clientId?: string },
  ): Promise<Ack<Record<string, unknown>>> {
    const ctx = this.ctxOf(client, b?.roomId);
    if (!ctx) return this.fail('not_in_room', 'Join the room first.');
    const { room, user } = ctx;

    const text = String(b?.message ?? '').trim().slice(0, MAX_CHAT_CHARS);
    if (!text) return this.fail('empty_message', 'Message is empty.');

    const now = Date.now();
    const recent = (this.chatWindow.get(user.id) ?? []).filter((t) => now - t < CHAT_WINDOW_MS);
    if (recent.length >= CHAT_MAX_PER_WINDOW) {
      return this.fail('rate_limited', 'You are sending messages too fast.');
    }
    recent.push(now);
    this.chatWindow.set(user.id, recent);

    let id = `m_${now}_${Math.random().toString(36).slice(2, 8)}`;
    let createdAt = new Date(now).toISOString();
    try {
      const saved = await this.roomsService.sendChatMessage(room.roomId, user.id, user.role, {
        message: text,
      });
      id = saved.id;
      createdAt = saved.createdAt.toISOString();
    } catch (e) {
      this.logger.debug(`chat persist skipped: ${(e as Error)?.message}`);
    }

    const msg = {
      id,
      clientId: b?.clientId ?? null,
      roomId: room.roomId,
      senderId: user.id,
      senderName: user.fullName,
      role: user.role,
      message: text,
      createdAt,
    };
    this.server.to(room.roomId).emit('interview:chat-message', msg);
    return { ok: true, id };
  }

  @SubscribeMessage('interview:recording-status')
  onRecording(
    @ConnectedSocket() client: Socket,
    @MessageBody() b: { roomId?: string; recording?: boolean },
  ): Ack {
    const ctx = this.ctxOf(client, b?.roomId);
    if (!ctx) return this.fail('not_in_room', 'Join the room first.');
    if (ctx.user.id !== ctx.room.hostUserId) {
      return this.fail('forbidden', 'Only the host can start or stop recording.');
    }
    ctx.room.recording = !!b?.recording;
    this.server.to(ctx.room.roomId).emit('interview:recording-status', {
      recording: ctx.room.recording,
      byUserId: ctx.user.id,
      at: Date.now(),
    });
    return { ok: true };
  }

  /** Speech-to-text lines produced in a browser; only the host (recruiter) receives them. */
  @SubscribeMessage('interview:transcript')
  onTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody() b: { roomId?: string; text?: string; ts?: number },
  ): Ack {
    const ctx = this.ctxOf(client, b?.roomId);
    if (!ctx) return this.fail('not_in_room', 'Join the room first.');
    const text = String(b?.text ?? '').trim().slice(0, 2_000);
    if (!text) return { ok: true };
    const host = ctx.room.hostUserId ? ctx.room.peers.get(ctx.room.hostUserId) : undefined;
    if (host && host.userId !== ctx.user.id) {
      this.server.to(host.socketId).emit('interview:transcript', {
        userId: ctx.user.id,
        name: ctx.user.fullName,
        role: ctx.user.role,
        text,
        ts: b?.ts ?? Date.now(),
      });
    }
    return { ok: true };
  }

  @SubscribeMessage('interview:end-room')
  async onEnd(@ConnectedSocket() client: Socket, @MessageBody() b: { roomId?: string }): Promise<Ack> {
    const ctx = this.ctxOf(client, b?.roomId);
    if (!ctx) return this.fail('not_in_room', 'Join the room first.');
    const { room, user } = ctx;

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (user.id !== room.hostUserId && !isAdmin) {
      return this.fail('forbidden', 'Only the host can end the interview.');
    }

    this.server.to(room.roomId).emit('interview:room-ended', {
      endedBy: user.id,
      endedAt: Date.now(),
    });

    void this.interviews
      .markRoomEnded(room.interviewId, room.roundId, user.id)
      .catch((e) => this.logger.debug(`markRoomEnded skipped: ${e?.message ?? e}`));

    for (const p of room.peers.values()) {
      if (p.graceTimer) clearTimeout(p.graceTimer);
    }
    this.rooms.delete(room.roomId);
    this.endedRooms.set(room.roomId, Date.now());
    return { ok: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  private removePeer(room: Room, userId: string, reason: string) {
    const peer = room.peers.get(userId);
    if (!peer) return;
    if (peer.graceTimer) clearTimeout(peer.graceTimer);
    room.peers.delete(userId);
    this.server.to(room.roomId).emit('interview:user-left', { userId, reason });

    void this.roomsService
      .leaveRoom(room.roomId, userId, peer.role)
      .catch((e) => this.logger.debug(`leaveRoom persist skipped: ${e?.message ?? e}`));

    this.logger.log(`${peer.name} left ${room.roomId} (${reason}); ${room.peers.size} remaining`);
    if (room.peers.size === 0) {
      room.recording = false;
      this.rooms.delete(room.roomId);
    }
  }

  private userOf(client: Socket): RealtimeUser | undefined {
    return client.data.user as RealtimeUser | undefined;
  }

  /** Resolve the caller's room, making sure this socket actually owns the seat. */
  private ctxOf(client: Socket, roomIdFromBody?: string) {
    const user = this.userOf(client);
    const roomId = (client.data.roomId as string | undefined) ?? roomIdFromBody;
    if (!user || !roomId) return null;
    if (roomIdFromBody && roomIdFromBody !== roomId) return null;
    const room = this.rooms.get(roomId);
    const peer = room?.peers.get(user.id);
    if (!room || !peer || peer.socketId !== client.id) return null;
    return { room, user };
  }

  private pub(p: Peer): PublicPeer {
    return {
      userId: p.userId,
      name: p.name,
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
      joinedAt: p.joinedAt,
      connected: p.connected,
    };
  }

  private iceServers() {
    const fromConfig = this.config.get<unknown[]>('webrtc.iceServers');
    return fromConfig?.length
      ? fromConfig
      : [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  }

  private fail(code: string, message: string): { ok: false; code: string; message: string } {
    return { ok: false, code, message };
  }

  private pruneEndedRooms() {
    const now = Date.now();
    for (const [id, at] of this.endedRooms) {
      if (now - at > ENDED_ROOM_TTL_MS) this.endedRooms.delete(id);
    }
  }
}