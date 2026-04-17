import { Controller, Get, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('interviews/room')
@UseGuards(JwtAuthGuard)
export class InterviewRoomController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get(':roomId/access')
  async access(@Req() req: any, @Param('roomId') roomId: string) {
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      req.user.id,
      req.user.role,
    );
    if (!access.allowed) throw new ForbiddenException('Not allowed to join this room');
    return access;
  }
}