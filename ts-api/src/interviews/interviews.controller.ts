/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// ts-api/src/interviews/interviews.controller.ts
@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('mock')
  async mockInterview(
    @Body() body: {
      messages: { role: string; content: string }[];
      role?: string;
      difficulty?: string;
    },
  ) {
    return this.interviewsService.generateResponse(
      body.messages,
      body.role,
      body.difficulty,
    );
  }

  @Post('scorecard')
  async scorecard(
    @Body() body: { messages: { role: string; content: string }[] },
  ) {
    return this.interviewsService.generateScorecard(body.messages);
  }
}