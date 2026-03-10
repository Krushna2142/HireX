/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
//C:\Projects\Job-Crawler\ts-api\src\interviews\interviews.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('interviews')
@UseGuards(JwtGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('mock')
  async mockInterview(@Body() body: { messages: { role: string; content: string }[] }) {
    return this.interviewsService.generateResponse(body.messages);
  }
}