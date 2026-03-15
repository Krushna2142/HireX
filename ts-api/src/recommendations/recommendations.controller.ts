/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Req, Query } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('jobs')
  getJobs(@Req() req: any, @Query('limit') limit?: string) {
    return this.recommendations.getJobRecommendations(
      req.user.id,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('skill-gaps')
  getSkillGaps(@Req() req: any) {
    return this.recommendations.getSkillGapAnalysis(req.user.id);
  }
}