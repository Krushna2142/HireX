import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterInterviewsService, StageKey } from './recruiter-interviews.service';

@Controller('recruiter/interviews')
@UseGuards(JwtAuthGuard)
export class RecruiterInterviewsController {
  constructor(private readonly service: RecruiterInterviewsService) {}

  @Post(':applicationId/init')
  init(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.service.initInterview(applicationId, req.user.id);
  }

  @Post(':interviewId/rounds')
  scheduleRound(
    @Param('interviewId') interviewId: string,
    @Req() req: any,
    @Body() body: {
      roundType: string;
      scheduledAt: string;
      durationMins?: number;
      mode?: string;
      interviewerId?: string;
    },
  ) {
    return this.service.scheduleRound(interviewId, req.user.id, body);
  }

  @Patch(':interviewId/stage')
  updateStage(
    @Param('interviewId') interviewId: string,
    @Req() req: any,
    @Body('stage') stage: StageKey,
  ) {
    return this.service.updateStage(interviewId, req.user.id, stage);
  }

  @Patch('rounds/:roundId/result')
  submitRoundResult(
    @Param('roundId') roundId: string,
    @Req() req: any,
    @Body() body: { result: string; score?: number; feedback?: string },
  ) {
    return this.service.submitRoundResult(roundId, req.user.id, body);
  }

  @Get('dashboard')
  dashboard(@Req() req: any, @Query('jobId') jobId?: string) {
    return this.service.getDashboard(req.user.id, jobId);
  }

  @Get(':interviewId')
  detail(@Param('interviewId') interviewId: string, @Req() req: any) {
    return this.service.getInterview(interviewId, req.user.id, req.user.role);
  }

  @Get()
  list(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listInterviews(req.user.id, req.user.role, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 20,
    });
  }
}