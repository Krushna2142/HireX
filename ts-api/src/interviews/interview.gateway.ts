import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InterviewsService } from './interviews.service';

type RoomUser = {
  userId: string;
  name?: string;
  role?: string;
  micOn?: boolean;
  camOn?: boolean;
  screenSharing?: boolean;
};

type SDP = {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
};

type ICE = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

@Injectable()
@WebSocketGateway({
  namespace: '/interview',
  cors: { origin: true, credentials: true },
  transports: ['websocket'],
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(InterviewGateway.name);

  // roomId -> (userId -> user meta)
  private readonly roomUsers = new Map<string, Map<string, RoomUser>>();

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        this.extractBearer(client.handshake.headers?.authorization as string | undefined);

      if (!token) throw new ForbiddenException('Missing auth token');

      const decoded = await this.jwtService.verifyAsync(token);
      (client as any).user = {
        id: decoded.sub ?? decoded.id,
        role: decoded.role,
        full_name: decoded.full_name,
      };
    } catch (e) {
      this.logger.warn(`Socket auth failed: ${String(e)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user as { id: string } | undefined;
    if (!user?.id) return;

    for (const [roomId, usersMap] of this.roomUsers.entries()) {
      if (usersMap.has(user.id)) {
        usersMap.delete(user.id);
        client.to(roomId).emit('interview:user-left', { userId: user.id });
        if (usersMap.size === 0) this.roomUsers.delete(roomId);
      }
    }
  }

  @SubscribeMessage('interview:join-room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; userId: string; name?: string; role?: string },
  ) {
    const authUser = (client as any).user as { id: string; role: string; full_name?: string };
    if (!authUser?.id) {
      client.emit('interview:error', { message: 'Unauthenticated' });
      return;
    }

    const access = await this.interviewsService.validateRoomAccess(
      body.roomId,
      authUser.id,
      authUser.role,
    );

    if (!access.allowed) {
      client.emit('interview:error', { message: 'Forbidden room access' });
      return;
    }

    await client.join(body.roomId);

    let usersMap = this.roomUsers.get(body.roomId);
    if (!usersMap) {
      usersMap = new Map<string, RoomUser>();
      this.roomUsers.set(body.roomId, usersMap);
    }

    usersMap.set(authUser.id, {
      userId: authUser.id,
      name: body.name ?? authUser.full_name,
      role: authUser.role,
      micOn: true,
      camOn: true,
      screenSharing: false,
    });

    const allUsers = Array.from(usersMap.values());

    // Snapshot for the joiner
    client.emit('interview:room-users', { users: allUsers });

    // Notify others
    client.to(body.roomId).emit('interview:user-joined', {
      user: usersMap.get(authUser.id),
    });
  }

  @SubscribeMessage('interview:leave-room')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ) {
    const authUser = (client as any).user as { id: string } | undefined;
    if (!authUser?.id) return;

    await client.leave(body.roomId);

    const usersMap = this.roomUsers.get(body.roomId);
    if (!usersMap) return;

    usersMap.delete(authUser.id);
    client.to(body.roomId).emit('interview:user-left', { userId: authUser.id });

    if (usersMap.size === 0) this.roomUsers.delete(body.roomId);
  }

  @SubscribeMessage('interview:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId: string; targetUserId: string; sdp: SDP },
  ) {
    const authUser = (client as any).user as { id: string };
    this.emitToUserInRoom(body.roomId, body.targetUserId, 'interview:offer', {
      fromUserId: authUser.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId: string; targetUserId: string; sdp: SDP },
  ) {
    const authUser = (client as any).user as { id: string };
    this.emitToUserInRoom(body.roomId, body.targetUserId, 'interview:answer', {
      fromUserId: authUser.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId: string; targetUserId: string; candidate: ICE },
  ) {
    const authUser = (client as any).user as { id: string };
    this.emitToUserInRoom(body.roomId, body.targetUserId, 'interview:ice-candidate', {
      fromUserId: authUser.id,
      candidate: body.candidate,
    });
  }

  @SubscribeMessage('interview:toggle-media')
  onToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; micOn: boolean; camOn: boolean; screenSharing?: boolean },
  ) {
    const authUser = (client as any).user as { id: string };
    const usersMap = this.roomUsers.get(body.roomId);
    if (usersMap?.has(authUser.id)) {
      const u = usersMap.get(authUser.id)!;
      u.micOn = body.micOn;
      u.camOn = body.camOn;
      u.screenSharing = body.screenSharing ?? false;
      usersMap.set(authUser.id, u);
    }

    client.to(body.roomId).emit('interview:user-media-toggled', {
      userId: authUser.id,
      micOn: body.micOn,
      camOn: body.camOn,
      screenSharing: body.screenSharing ?? false,
    });
  }

  @SubscribeMessage('interview:chat-message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ) {
    const authUser = (client as any).user as { id: string; full_name?: string; role?: string };
    const usersMap = this.roomUsers.get(body.roomId);
    const me = usersMap?.get(authUser.id);

    const msg = {
      userId: authUser.id,
      name: me?.name ?? authUser.full_name ?? 'Participant',
      role: me?.role ?? authUser.role,
      message: body.message,
      timestamp: new Date().toISOString(),
    };

    this.server.to(body.roomId).emit('interview:chat-message', msg);
  }

  private emitToUserInRoom(roomId: string, targetUserId: string, event: string, payload: unknown) {
    const sockets = this.server.sockets.adapter.rooms.get(roomId);
    if (!sockets?.size) return;

    for (const socketId of sockets) {
      const s = this.server.sockets.sockets.get(socketId);
      const user = (s as any)?.user as { id: string } | undefined;
      if (user?.id === targetUserId) {
        s?.emit(event, payload);
        return;
      }
    }
  }

  private extractBearer(authHeader?: string) {
    if (!authHeader) return null;
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    return m ? m[1] : null;
  }
}