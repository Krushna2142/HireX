/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Req, Query } from '@nestjs/common';
import {
  RecommendationsService,
  JobRecommendation,
  SkillGapAnalysis,
} from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('jobs')
  getJobs(
    @Req() req: any,
    @Query('limit') limit?: string,
  ): Promise<{
    recommendations: JobRecommendation[];
    reason?: string;
    profile?: object;
  }> {
    return this.recommendations.getJobRecommendations(
      req.user.id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('skill-gaps')
  getSkillGaps(@Req() req: any): Promise<SkillGapAnalysis | null> {
    return this.recommendations.getSkillGapAnalysis(req.user.id);
  }
}