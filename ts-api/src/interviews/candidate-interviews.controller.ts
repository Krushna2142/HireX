/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// ts-api/src/interviews/candidate-interviews.controller.ts

import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewsService } from './interviews.service';

@Controller('candidate/interviews')
@UseGuards(JwtAuthGuard)
export class CandidateInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  listMy(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.interviewsService.listCandidateInterviews(req.user.id, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.interviewsService.getCandidateInterview(req.user.id, id);
  }
}