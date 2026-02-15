import { Controller, Post, Body } from '@nestjs/common';
import { InterviewsService } from './interviews.service';

@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('score')
  async scoreInterview(@Body() body: any) {
    return this.interviewsService.scoreInterview(body);
  }
}
