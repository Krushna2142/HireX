/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly db: DatabaseService) {}

  async getJobRecommendations(candidateId: string, limit = 10) {
    // Fetch candidate profile for scoring context
    const { rows: profileRows } = await this.db.query(
      `SELECT cp.top_skills, cp.experience_level, cp.experience_years,
              cp.target_roles, cp.work_mode, cp.salary_min, cp.salary_max
       FROM candidate_profiles cp
       WHERE cp.user_id = $1`,
      [candidateId],
    );

    if (!profileRows.length) return { recommendations: [], reason: 'Complete your profile for recommendations' };

    const profile = profileRows[0];
    const skills:  string[] = profile.top_skills || [];
    const targetRoles: string[] = profile.target_roles || [];

    // Fetch jobs not yet applied to — with rich scoring via SQL
    const { rows: jobs } = await this.db.query(
      `SELECT
         j.*,
         u.full_name AS recruiter_name,
         -- Skill overlap score (0-100)
         CASE
           WHEN array_length(j.required_skills, 1) IS NULL THEN 0
           ELSE ROUND(
             (
               SELECT COUNT(*)::FLOAT
               FROM unnest(j.required_skills) rs
               WHERE rs = ANY($2::text[])
             ) / array_length(j.required_skills, 1) * 100
           )::INTEGER
         END AS skill_score,
         -- Work mode preference match
         CASE WHEN $3::text IS NULL OR j.work_mode = $3 THEN 20 ELSE 0 END AS mode_score,
         -- Salary in range
         CASE
           WHEN $4::integer IS NULL THEN 10
           WHEN j.salary_max IS NULL THEN 10
           WHEN j.salary_max >= $4 THEN 15
           ELSE 0
         END AS salary_score
       FROM jobs j
       JOIN users u ON u.id = j.recruiter_id
       WHERE j.status = 'active'
         AND j.id NOT IN (
           SELECT job_id FROM applications WHERE candidate_id = $1
         )
       ORDER BY (skill_score + mode_score + salary_score) DESC, j.created_at DESC
       LIMIT $5`,
      [
        candidateId,
        skills,
        profile.work_mode,
        profile.salary_min,
        limit,
      ],
    );

    // Map to unified format with composite score
    const recommendations = jobs.map(job => ({
      id:             job.id,
      source:         'internal' as const,
      title:          job.title,
      company:        job.company,
      location:       job.location,
      workMode:       job.work_mode,
      employmentType: job.employment_type,
      salaryMin:      job.salary_min,
      salaryMax:      job.salary_max,
      salaryCurrency: job.salary_currency,
      requiredSkills: job.required_skills,
      description:    job.description,
      postedAt:       job.created_at,
      applyUrl:       null,
      recruiterName:  job.recruiter_name,
      applicantCount: job.applicant_count,
      status:         job.status,
      matchScore:     Math.min(
        100,
        (job.skill_score || 0) + (job.mode_score || 0) + (job.salary_score || 0),
      ),
      matchReason: this.buildMatchReason(job, profile, skills),
    }));

    return {
      recommendations,
      profile: {
        skills,
        experienceLevel: profile.experience_level,
        workMode:        profile.work_mode,
      },
    };
  }

  // ── GET skill gap analysis ─────────────────────────────────────────────────
  // Compare candidate skills against most-demanded skills in their target roles

  async getSkillGapAnalysis(candidateId: string) {
    const { rows: profileRows } = await this.db.query(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [candidateId],
    );

    if (!profileRows.length) return null;

    const userSkills: string[] = profileRows[0].top_skills || [];

    // Find most common skills in active jobs
    const { rows: demandRows } = await this.db.query(
      `SELECT
         skill,
         COUNT(*) AS demand_count,
         COUNT(*) FILTER (WHERE skill = ANY($1::text[])) > 0 AS candidate_has
       FROM jobs, unnest(required_skills) AS skill
       WHERE status = 'active'
       GROUP BY skill
       ORDER BY demand_count DESC
       LIMIT 20`,
      [userSkills],
    );

    const gaps    = demandRows.filter(r => !r.candidate_has);
    const matches = demandRows.filter(r => r.candidate_has);

    return {
      userSkills,
      topDemandedSkills: demandRows,
      skillGaps:         gaps.slice(0, 8),
      matchedSkills:     matches,
      coveragePercent:   demandRows.length > 0
        ? Math.round((matches.length / demandRows.length) * 100)
        : 0,
    };
  }

  private buildMatchReason(
    job: any,
    profile: any,
    userSkills: string[],
  ): string {
    const overlapping = (job.required_skills || [])
      .filter((s: string) => userSkills.includes(s));

    const reasons: string[] = [];

    if (overlapping.length > 0) {
      reasons.push(`matches ${overlapping.slice(0, 3).join(', ')}`);
    }
    if (job.mode_score > 0 && profile.work_mode) {
      reasons.push(`${profile.work_mode} role`);
    }
    if (job.salary_score > 0) {
      reasons.push('within salary range');
    }

    return reasons.length > 0
      ? `Recommended because it ${reasons.join(', ')}`
      : 'Based on your profile';
  }
}