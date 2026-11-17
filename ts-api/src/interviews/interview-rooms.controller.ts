import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewsService } from './interviews.service';
import {
  AIAssistInput,
  ChatMessageInput,
  InterviewRoomsService,
  MediaStateInput,
  RoomEventInput,
  ScorecardInput,
} from './interview-rooms.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
};

@Controller('interviews/room')
@UseGuards(JwtAuthGuard)
export class InterviewRoomsController {
  constructor(
    private readonly rooms: InterviewRoomsService,
    private readonly interviews: InterviewsService,
    private readonly config: ConfigService,
  ) {}

  /** Flat room metadata for the room UI (title, round, names, timer length). */
  @Get(':roomId/info')
  getInfo(@Param('roomId') roomId: string, @Req() req: AuthenticatedRequest) {
    return this.interviews.getRoomInfo(roomId, req.user.id, req.user.role ?? '');
  }

  /** STUN/TURN servers for the browser's RTCPeerConnection. */
  @Get('ice-servers/list')
  getIceServers() {
    return {
      iceServers: this.config.get('webrtc.iceServers') ?? [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };
  }

  @Get(':roomId/access')
  getAccess(@Param('roomId') roomId: string, @Req() req: AuthenticatedRequest) {
    return this.rooms.validateRoomAccess(roomId, req.user.id, req.user.role);
  }

  @Get(':roomId/state')
  getState(@Param('roomId') roomId: string, @Req() req: AuthenticatedRequest) {
    return this.rooms.getRoomState(roomId, req.user.id, req.user.role);
  }

  @Post(':roomId/join')
  joinRoom(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      displayName?: string;
      rtcClientId?: string;
    },
  ) {
    return this.rooms.joinRoom(
      roomId,
      req.user.id,
      req.user.role,
      body?.displayName ?? req.user.full_name ?? req.user.email,
      body?.rtcClientId,
    );
  }

  @Post(':roomId/leave')
  leaveRoom(@Param('roomId') roomId: string, @Req() req: AuthenticatedRequest) {
    return this.rooms.leaveRoom(roomId, req.user.id, req.user.role);
  }

  @Patch(':roomId/media-state')
  updateMediaState(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: MediaStateInput,
  ) {
    return this.rooms.updateMediaState(
      roomId,
      req.user.id,
      req.user.role,
      body,
    );
  }

  @Post(':roomId/events')
  recordEvent(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: RoomEventInput,
  ) {
    return this.rooms.recordRoomEvent(roomId, req.user.id, body);
  }

  @Post(':roomId/chat')
  sendChat(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: ChatMessageInput,
  ) {
    return this.rooms.sendChatMessage(roomId, req.user.id, req.user.role, body);
  }

  @Get(':roomId/scorecard')
  getScorecard(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rooms.getScorecard(roomId, req.user.id, req.user.role);
  }

  @Post(':roomId/scorecard')
  saveScorecard(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: ScorecardInput,
  ) {
    return this.rooms.saveScorecard(roomId, req.user.id, req.user.role, body);
  }

  @Post(':roomId/ai/follow-up')
  generateFollowUp(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: AIAssistInput,
  ) {
    return this.rooms.generateFollowUpQuestion(
      roomId,
      req.user.id,
      req.user.role,
      body,
    );
  }

  @Post(':roomId/ai/summary')
  generateSummary(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: AIAssistInput,
  ) {
    return this.rooms.generateAISummary(
      roomId,
      req.user.id,
      req.user.role,
      body,
    );
  }

  @Post(':roomId/end')
  endRoom(
    @Param('roomId') roomId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.rooms.endRoom(roomId, req.user.id, req.user.role, body);
  }
}