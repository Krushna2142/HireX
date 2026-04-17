import {
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewsService } from '../interviews/interviews.service';
import { LivekitService } from './livekit.service';

@Controller('interviews/room')
@UseGuards(JwtAuthGuard)
export class LivekitController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly livekitService: LivekitService,
  ) {}

  @Post(':roomId/token')
  async issueRoomToken(@Req() req: any, @Param('roomId') roomId: string) {
    const access = await this.interviewsService.validateRoomAccessWithContext(
      roomId,
      req.user.id,
      req.user.role,
    );

    if (!access.allowed) {
      throw new ForbiddenException('Not allowed to access this room');
    }

    return this.livekitService.buildRoomToken({
      roomId,
      userId: req.user.id,
      userName: req.user.full_name ?? req.user.email ?? 'Participant',
      role: req.user.role,
      metadata: {
        interviewId: access.interviewId,
        roundId: access.roundId,
      },
    });
  }
}