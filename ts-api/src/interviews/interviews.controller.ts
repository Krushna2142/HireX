/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller, Post, Get, Param, Body, Req,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Post('sessions')
  startSession(
    @Req() req: any,
    @Body('jobTitle')     jobTitle: string,
    @Body('company')      company: string,
    @Body('sessionType')  sessionType: string = 'technical',
    @Body('jobId')        jobId?: string,
  ) {
    return this.interviews.startSession(
      req.user.id, jobTitle, company, sessionType, jobId,
    );
  }

  @Post('questions/:questionId/answer')
  submitAnswer(
    @Param('questionId')        questionId: string,
    @Req()                      req: any,
    @Body('answer')             answer: string,
    @Body('timeTakenSecs')      timeTakenSecs: number,
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
/*

---

## Step 3 — Recommendations Engine

### Architecture

Recommendations are **not** just high-match-score jobs. They're personalized based on three signals ranked by recency weight:
```
Signal 1: Skill overlap         → skills in resume vs job required_skills
Signal 2: Career trajectory     → experience level progression patterns
Signal 3: Application behavior  → what jobs the candidate previously applied to
*/