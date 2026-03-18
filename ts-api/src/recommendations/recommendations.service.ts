/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService }    from '../database/database.service';

// ── Typed DB row interfaces — all exported so controllers can reference them ──

/**
 * Lightweight profile shape used for enriched lookups (title + industry context).
 * Returned by the dedicated fetchCandidateProfile helper.
 */
export interface ProfileRow {
  top_skills:       string[];
  experience_level: string;
  current_title:    string | null;
  industry_tags:    string[] | null; // mapped from target_industries column
}

export interface CandidateProfileRow {
  top_skills:       string[];
  experience_level: string;
  experience_years: number;
  target_roles:     string[];
  work_mode:        string | null;
  salary_min:       number | null;
  salary_max:       number | null;
}

export interface JobRecommendationRow {
  id:              string;
  title:           string;
  company:         string;
  location:        string | null;
  work_mode:       string | null;
  employment_type: string | null;
  salary_min:      number | null;
  salary_max:      number | null;
  salary_currency: string;
  required_skills: string[];
  description:     string;
  created_at:      Date;
  apply_url:       string | null;
  recruiter_name:  string;
  applicant_count: string;
  status:          string;
  skill_score:     number;
  mode_score:      number;
  salary_score:    number;
}

export interface SkillDemandRow {
  skill:         string;
  demand_count:  string;
  candidate_has: boolean;
}

export interface SkillsProfileRow {
  top_skills: string[];
}

// ── Recommendation result shape (returned to controller) ─────────────────────

export interface JobRecommendation {
  id:              string;
  source:          'internal';
  title:           string;
  company:         string;
  location:        string | null;
  workMode:        string | null;
  employmentType:  string | null;
  salaryMin:       number | null;
  salaryMax:       number | null;
  salaryCurrency:  string;
  requiredSkills:  string[];
  description:     string;
  postedAt:        Date;
  applyUrl:        null;
  recruiterName:   string;
  applicantCount:  string;
  status:          string;
  matchScore:      number;
  matchReason:     string;
}

export interface SkillGapAnalysis {
  userSkills:        string[];
  topDemandedSkills: SkillDemandRow[];
  skillGaps:         SkillDemandRow[];
  matchedSkills:     SkillDemandRow[];
  coveragePercent:   number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly db: DatabaseService) {}

  // ── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Fetches the enriched candidate profile row including current job title
   * and target industry tags. Used wherever we need richer context beyond
   * the base skills/salary/work-mode profile.
   *
   * Maps `target_industries` → `industry_tags` at the SQL level so the
   * application layer always works with the canonical `ProfileRow` shape.
   */
  private async fetchCandidateProfile(userId: string): Promise<ProfileRow | null> {
    const { rows } = await this.db.query<ProfileRow>(
      `SELECT top_skills,
              experience_level,
              current_title,
              target_industries AS industry_tags
       FROM candidate_profiles
       WHERE user_id = $1`,
      [userId],
    );

    return rows.length ? rows[0] : null;
  }

  // ── Public Methods ─────────────────────────────────────────────────────────

  async getJobRecommendations(
    candidateId: string,
    limit = 10,
  ): Promise<{ recommendations: JobRecommendation[]; reason?: string; profile?: object }> {

    // ── 1. Fetch full candidate profile (existing scoring fields) ────────────
    const { rows: profileRows } = await this.db.query<CandidateProfileRow>(
      `SELECT cp.top_skills, cp.experience_level, cp.experience_years,
              cp.target_roles, cp.work_mode, cp.salary_min, cp.salary_max
       FROM candidate_profiles cp
       WHERE cp.user_id = $1`,
      [candidateId],
    );

    if (!profileRows.length) {
      return { recommendations: [], reason: 'Complete your profile for recommendations' };
    }

    // ── 2. Fetch enriched profile (title + industry context) ─────────────────
    const enrichedProfile = await this.fetchCandidateProfile(candidateId);

    const profile      = profileRows[0];
    const skills:      string[] = profile.top_skills   || [];
    const targetRoles: string[] = profile.target_roles || [];

    // ── 3. Score and fetch matching jobs ─────────────────────────────────────
    const { rows: jobs } = await this.db.query<JobRecommendationRow>(
      `SELECT
         j.*,
         u.full_name AS recruiter_name,
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
         CASE WHEN $3::text IS NULL OR j.work_mode = $3 THEN 20 ELSE 0 END AS mode_score,
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

    const recommendations: JobRecommendation[] = jobs.map(job => ({
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
      matchScore: Math.min(
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
        // Enriched fields exposed to consumers if available
        currentTitle:    enrichedProfile?.current_title   ?? null,
        industryTags:    enrichedProfile?.industry_tags   ?? [],
      },
    };
  }

  async getSkillGapAnalysis(candidateId: string): Promise<SkillGapAnalysis | null> {
    const { rows: profileRows } = await this.db.query<SkillsProfileRow>(
      'SELECT top_skills FROM candidate_profiles WHERE user_id = $1',
      [candidateId],
    );

    if (!profileRows.length) return null;

    const userSkills: string[] = profileRows[0].top_skills || [];

    const { rows: demandRows } = await this.db.query<SkillDemandRow>(
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
    const matches = demandRows.filter(r =>  r.candidate_has);

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
    job:        JobRecommendationRow,
    profile:    CandidateProfileRow,
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