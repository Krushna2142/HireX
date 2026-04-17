import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewRoomsService } from './interview-rooms.service';

@Controller('interview/rooms')
@UseGuards(JwtAuthGuard)
export class InterviewRoomsController {
  constructor(private readonly rooms: InterviewRoomsService) {}

  @Post('create')
  async create(@Req() req: any, @Body() body: any) {
    const user = req.user;
    return this.rooms.createRoom({
      recruiterRoundId: body.recruiterRoundId,
      sessionId: body.sessionId,
      hostUserId: user.id,
      roomName: body.roomName,
      maxParticipants: body.maxParticipants,
      provider: body.provider,
    });
  }

  @Post('join')
  async join(@Req() req: any, @Body() body: { roomId: string; displayName?: string }) {
    const user = req.user;
    return this.rooms.joinRoom(body.roomId, user.id, body.displayName, user.role);
  }

  @Post('leave')
  async leave(@Req() req: any, @Body() body: { roomId: string }) {
    const user = req.user;
    return this.rooms.leaveRoom(body.roomId, user.id);
  }

  @Post('session/start')
  async startSession(@Req() req: any, @Body() body: { interviewId: string; roundId: string }) {
    const user = req.user;
    return this.rooms.startSession(body.interviewId, body.roundId, user.id);
  }

  @Post('session/end')
  async endSession(@Req() req: any, @Body() body: { interviewId: string; roundId: string }) {
    const user = req.user;
    return this.rooms.endSession(body.interviewId, body.roundId, user.id);
  }

  @Get(':roomId')
  async getRoom(@Param('roomId') roomId: string) {
    return this.rooms.getRoom(roomId);
  }
}
