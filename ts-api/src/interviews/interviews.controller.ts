/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { FirebaseGuard } from '../auth/firebase.guard';

@Controller('interviews')
@UseGuards(FirebaseGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('mock')
  async mockInterview(@Body() body: { messages: { role: string; content: string }[] }) {
    return this.interviewsService.generateResponse(body.messages);
  }
}