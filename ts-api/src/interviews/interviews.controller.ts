/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Controller, Post, Get, Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  InterviewsService,
  AnswerEvaluation,
  InterviewQuestionRow,
} from './interviews.service';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  // ── POST /interviews/sessions ─────────────────────────────────────────────

  @Post('sessions')
  startSession(
    @Req()               req: any,
    @Body('jobTitle')    jobTitle: string,
    @Body('company')     company: string,
    @Body('sessionType') sessionType: string,
    @Body('jobId')       jobId?: string,
  ) {
    return this.interviews.startSession(
      req.user.id,
      jobTitle,
      company,
      sessionType ?? 'technical',
      jobId,
    );
  }

  // ── POST /interviews/questions/:questionId/answer ─────────────────────────
  // Explicit return type — AnswerEvaluation is exported from service

  @Post('questions/:questionId/answer')
  submitAnswer(
    @Param('questionId')   questionId: string,
    @Req()                 req: any,
    @Body('answer')        answer: string,
    @Body('timeTakenSecs') timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    return this.interviews.submitAnswer(
      questionId,
      req.user.id,
      answer,
      timeTakenSecs,
    ) as Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }>;
  }

  // ── POST /interviews/sessions/:sessionId/complete ─────────────────────────

  @Post('sessions/:sessionId/complete')
  complete(
    @Param('sessionId') sessionId: string,
    @Req()              req: any,
  ) {
    return this.interviews.completeSession(sessionId, req.user.id);
  }

  // ── GET /interviews/sessions ──────────────────────────────────────────────

  @Get('sessions')
  history(@Req() req: any) {
    return this.interviews.getSessionHistory(req.user.id);
  }

  // ── GET /interviews/sessions/:sessionId ───────────────────────────────────
  // Explicit return type — InterviewQuestionRow is exported from service

  @Get('sessions/:sessionId')
  getSession(
    @Param('sessionId') sessionId: string,
    @Req()              req: any,
  ): Promise<{ session: Record<string, unknown>; questions: InterviewQuestionRow[] }> {
    return this.interviews.getSession(
      sessionId,
      req.user.id,
    ) as Promise<{ session: Record<string, unknown>; questions: InterviewQuestionRow[] }>;
  }
}
