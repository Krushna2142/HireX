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

  // ── GET /recommendations/jobs ─────────────────────────────────────────────
  // Skill-matched job recommendations for the authenticated candidate.
  // Explicit return type so TS4053 cannot fire — all types are exported.

  @Get('jobs')
  getJobs(
    @Req()          req: any,
    @Query('limit') limit?: string,
  ): Promise<{ recommendations: JobRecommendation[]; reason?: string; profile?: object }> {
    return this.recommendations.getJobRecommendations(
      req.user.id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ── GET /recommendations/skill-gaps ──────────────────────────────────────
  // Compares candidate's top_skills against the most-demanded skills
  // across all active job listings — surfaces what to learn next.

  @Get('skill-gaps')
  getSkillGaps(
    @Req() req: any,
  ): Promise<SkillGapAnalysis | null> {       // ← explicit, TS can name it
    return this.recommendations.getSkillGapAnalysis(req.user.id);
  }
}