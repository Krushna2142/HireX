/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

type FeedbackPayload = {
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  culture_fit_score?: number;
  strengths?: string;
  improvements?: string;
  notes?: string;
  recommendation: 'HIRE' | 'REJECT' | 'HOLD';
};

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post('round/:roundId')
  create(
    @Param('roundId') roundId: string,
    @Req() req: any,
    @Body() body: FeedbackPayload,
  ) {
    return this.feedback.create(roundId, req.user.id, body);
  }

  @Get('round/:roundId')
  getByRound(@Param('roundId') roundId: string, @Req() req: any) {
    return this.feedback.getByRound(roundId, req.user.id, req.user.role);
  }

  @Get('interview/:interviewId')
  getByInterview(@Param('interviewId') interviewId: string, @Req() req: any) {
    return this.feedback.getByInterview(
      interviewId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('interview/:interviewId/summary')
  getSummary(@Param('interviewId') interviewId: string, @Req() req: any) {
    return this.feedback.getSummary(interviewId, req.user.id, req.user.role);
  }

  @Patch(':feedbackId')
  update(
    @Param('feedbackId') feedbackId: string,
    @Req() req: any,
    @Body() body: Partial<FeedbackPayload>,
  ) {
    return this.feedback.update(feedbackId, req.user.id, body);
  }
}
