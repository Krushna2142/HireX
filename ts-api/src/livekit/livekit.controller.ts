/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewRoomsService } from '../interviews/interview-rooms.service';
import { LivekitService } from './livekit.service';

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
export class LivekitController {
  constructor(
    private readonly rooms: InterviewRoomsService,
    private readonly livekit: LivekitService,
  ) {}

  @Post(':roomId/token')
  async issueRoomToken(
    @Req() req: AuthenticatedRequest,
    @Param('roomId') roomId: string,
  ) {
    const access = await this.rooms.validateRoomAccess(
      roomId,
      req.user.id,
      req.user.role,
    );

    if (!access.allowed) {
      throw new ForbiddenException('Not allowed to access this room');
    }

    const displayName =
      req.user.full_name ??
      req.user.email ??
      `${access.role ?? 'participant'}`;

    const token = await this.livekit.buildRoomToken({
      roomId: access.providerRoomId ?? access.roomId ?? roomId,
      userId: req.user.id,
      userName: displayName,
      role: access.role,
      metadata: {
        interviewId: access.interviewId,
        roundId: access.roundId,
        actualRoomId: access.roomId,
        isRecruiter: access.isRecruiter,
        isCandidate: access.isCandidate,
        isAdmin: access.isAdmin,
      },
      ttl: '30m',
    });

    await this.rooms.recordRoomEvent(access.roomId ?? roomId, req.user.id, {
      eventType: 'livekit_token_issued',
      payload: {
        role: access.role,
        roundId: access.roundId,
      },
    });

    return token;
  }
}