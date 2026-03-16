/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Controller, Post, Get, Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Post('sessions')
  startSession(
    @Req() req: any,
    @Body('jobTitle')    jobTitle: string,
    @Body('company')     company: string,
    @Body('sessionType') sessionType: string,
    @Body('jobId')       jobId?: string,
  ) {
    return this.interviews.startSession(
      req.user.id, jobTitle, company, sessionType ?? 'technical', jobId,
    );
  }

  @Post('questions/:questionId/answer')
  submitAnswer(
    @Param('questionId')   questionId: string,
    @Req()                 req: any,
    @Body('answer')        answer: string,
    @Body('timeTakenSecs') timeTakenSecs: number,
  ) {
    return this.interviews.submitAnswer(
      questionId, req.user.id, answer, timeTakenSecs,
    );
  }

  @Post('sessions/:sessionId/complete')
  complete(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.interviews.completeSession(sessionId, req.user.id);
  }

  @Get('sessions')
  history(@Req() req: any) {
    return this.interviews.getSessionHistory(req.user.id);
  }

  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.interviews.getSession(sessionId, req.user.id);
  }
}