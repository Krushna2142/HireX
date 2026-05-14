
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/recommendations/recommendations.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AtsService, AtsScoreResponse } from '../ats/ats.service';

export interface CandidateProfileRow {
  top_skills: string[];
  experience_level: string | null;
  experience_years: number | null;
  current_title: string | null;
  target_roles: string[] | null;
  industry_tags: string[] | null;
}

export interface ResumeAnalysisRow {
  id: string;
  resume_id: string;
  raw_text: string | null;
  personal_info: Record<string, unknown> | null;
  work_experience: unknown;
  education: unknown;
  skills: unknown;
  certifications: unknown;
  projects: unknown;
  experience_years: number | null;
  experience_level: string | null;
  top_skills: string[] | null;
  industry_tags: string[] | null;
  trajectory: string | null;
  status: string;
  analysis_json: Record<string, unknown> | null;
}

export interface JobRecommendationRow {
  id: string;
  source: 'internal' | 'serpapi' | 'linkedin' | 'indeed';
  title: string;
  company: string;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  required_skills: string[];
  description: string;
  created_at: Date;
  published_at: Date | null;
  apply_url: string | null;
  recruiter_name: string | null;
  applicant_count: string;
  status: string;
  skill_score: number;
  role_score: number;
}

export interface SkillDemandRow {
  skill: string;
  demand_count: string;
  candidate_has: boolean;
}

export interface JobRecommendation {
  id: string;
  source: 'internal' | 'serpapi' | 'linkedin' | 'indeed';
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  postedAt: Date | string;
  applyUrl: string | null;
  recruiterName: string | null;
  applicantCount: string;
  status: string;

  matchScore: number;
  atsScore: number;
  atsRecommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  matchedSkills: string[];
  missingSkills: string[];
  matchReason: string;
  atsReason: string;
}

export interface SkillGapAnalysis {
  userSkills: string[];
  topDemandedSkills: SkillDemandRow[];
  skillGaps: SkillDemandRow[];
  matchedSkills: SkillDemandRow[];
  coveragePercent: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ats: AtsService,
  ) {}

  async getJobRecommendations(
    candidateId: string,
    limit = 10,
  ): Promise<{
    recommendations: JobRecommendation[];
    reason?: string;
    profile?: object;
  }> {
    const safeLimit = Math.min(Math.max(limit || 10, 1), 25);

    const profile = await this.fetchCandidateProfile(candidateId);

    if (!profile) {
      return {
        recommendations: [],
        reason: 'Upload and analyse your resume to unlock recommendations.',
      };
    }

    const latestAnalysis = await this.fetchLatestResumeAnalysis(candidateId);

    if (!latestAnalysis) {
      return {
        recommendations: [],
        reason: 'Resume analysis is not ready yet.',
        profile: {
          skills: profile.top_skills ?? [],
          experienceLevel: profile.experience_level ?? 'fresher',
        },
      };
    }

    const skills = this.cleanStringArray(profile.top_skills);
    const targetRoles = this.cleanStringArray(profile.target_roles);

    if (!skills.length) {
      return {
        recommendations: [],
        reason: 'No skills found in analysed resume. Re-run resume analysis.',
      };
    }

    const { rows: jobs } = await this.db.query<JobRecommendationRow>(
      `SELECT
         j.id,
         j.source,
         j.title,
         j.company_name AS company,
         j.location,
         j.work_mode,
         j.employment_type,
         j.salary_min,
         j.salary_max,
         COALESCE(j.salary_currency, 'INR') AS salary_currency,
         COALESCE(j.required_skills, ARRAY[]::text[]) AS required_skills,
         COALESCE(j.description, '') AS description,
         j.created_at,
         j.published_at,
         j.apply_url,
         u.full_name AS recruiter_name,
         COUNT(a.id)::text AS applicant_count,

         j.status,

         CASE
           WHEN array_length(j.required_skills, 1) IS NULL THEN 0
           ELSE ROUND(
             (
               SELECT COUNT(*)::FLOAT
               FROM unnest(j.required_skills) rs
               WHERE lower(rs) = ANY($2::text[])
             ) / GREATEST(array_length(j.required_skills, 1), 1) * 100
           )::INTEGER
         END AS skill_score,

         CASE
           WHEN $3::text[] IS NULL OR array_length($3::text[], 1) IS NULL THEN 0
           WHEN EXISTS (
             SELECT 1
             FROM unnest($3::text[]) tr
             WHERE lower(j.title) ILIKE '%' || lower(tr) || '%'
           ) THEN 15
           ELSE 0
         END AS role_score

       FROM jobs j
       LEFT JOIN users u ON u.id = j.recruiter_user_id
       LEFT JOIN job_applications a ON a.job_id = j.id

       WHERE j.status = 'PUBLISHED'
         AND j.id NOT IN (
           SELECT ja.job_id
           FROM job_applications ja
           WHERE ja.candidate_user_id = $1
         )

       GROUP BY
         j.id,
         u.full_name

       ORDER BY
         (skill_score + role_score) DESC,
         j.published_at DESC NULLS LAST,
         j.created_at DESC

       LIMIT $4`,
      [
        candidateId,
        skills.map((skill) => skill.toLowerCase()),
        targetRoles.length ? targetRoles : null,
        safeLimit,
      ],
    );

    const resumeAnalysisPayload = this.buildResumeAnalysisPayload(latestAnalysis);

    const recommendations = await Promise.all(
      jobs.map(async (job) => {
        const atsResult = await this.safeAtsScore(job, resumeAnalysisPayload);

        const baseMatch = Math.min(
          100,
          Number(job.skill_score ?? 0) + Number(job.role_score ?? 0),
        );

        const finalMatch = Math.round(
          Math.max(baseMatch, atsResult.atsScore * 0.85),
        );

        return this.mapRecommendation(job, finalMatch, atsResult, profile);
      }),
    );

    recommendations.sort((a, b) => b.atsScore - a.atsScore || b.matchScore - a.matchScore);

    return {
      recommendations,
      profile: {
        skills,
        experienceLevel: profile.experience_level ?? 'fresher',
        experienceYears: profile.experience_years ?? 0,
        currentTitle: profile.current_title ?? null,
        targetRoles,
        industryTags: this.cleanStringArray(profile.industry_tags),
      },
    };
  }

  async getSkillGapAnalysis(candidateId: string): Promise<SkillGapAnalysis | null> {
    const profile = await this.fetchCandidateProfile(candidateId);

    if (!profile) return null;

    const userSkills = this.cleanStringArray(profile.top_skills);

    const { rows: demandRows } = await this.db.query<SkillDemandRow>(
      `SELECT
         skill,
         COUNT(*) AS demand_count,
         COUNT(*) FILTER (WHERE lower(skill) = ANY($1::text[])) > 0 AS candidate_has
       FROM jobs, unnest(required_skills) AS skill
       WHERE status = 'PUBLISHED'
       GROUP BY skill
       ORDER BY demand_count DESC
       LIMIT 20`,
      [userSkills.map((skill) => skill.toLowerCase())],
    );

    const gaps = demandRows.filter((row) => !row.candidate_has);
    const matches = demandRows.filter((row) => row.candidate_has);

    return {
      userSkills,
      topDemandedSkills: demandRows,
      skillGaps: gaps.slice(0, 8),
      matchedSkills: matches,
      coveragePercent:
        demandRows.length > 0
          ? Math.round((matches.length / demandRows.length) * 100)
          : 0,
    };
  }

  private async fetchCandidateProfile(
    userId: string,
  ): Promise<CandidateProfileRow | null> {
    const { rows } = await this.db.query<CandidateProfileRow>(
      `SELECT
         top_skills,
         experience_level,
         experience_years,
         current_title,
         target_roles,
         target_industries AS industry_tags
       FROM jobseeker_profiles
       WHERE user_id = $1`,
      [userId],
    );

    return rows[0] ?? null;
  }

  private async fetchLatestResumeAnalysis(
    userId: string,
  ): Promise<ResumeAnalysisRow | null> {
    const { rows } = await this.db.query<ResumeAnalysisRow>(
      `SELECT
         ra.id,
         ra.resume_id,
         ra.raw_text,
         ra.personal_info,
         ra.work_experience,
         ra.education,
         ra.skills,
         ra.certifications,
         ra.projects,
         ra.experience_years,
         ra.experience_level,
         ra.top_skills,
         ra.industry_tags,
         ra.trajectory,
         ra.status,
         r.analysis_json
       FROM resume_analyses ra
       JOIN resumes r ON r.id = ra.resume_id
       WHERE r.user_id = $1
         AND ra.status = 'COMPLETED'
       ORDER BY ra.processed_at DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );

    return rows[0] ?? null;
  }

  private buildResumeAnalysisPayload(row: ResumeAnalysisRow): Record<string, unknown> {
    const analysisJson = row.analysis_json ?? {};

    return {
      ...analysisJson,
      rawTextPreview: row.raw_text ?? analysisJson.rawTextPreview,
      personalInfo: row.personal_info ?? analysisJson.personalInfo,
      workExperience: row.work_experience ?? analysisJson.workExperience,
      education: row.education ?? analysisJson.education,
      skills: this.extractSkillsFromJson(row.skills, row.top_skills),
      topSkills: this.cleanStringArray(row.top_skills),
      projects: row.projects ?? analysisJson.projects,
      certifications: row.certifications ?? analysisJson.certifications,
      experienceYears: row.experience_years ?? analysisJson.experienceYears,
      experienceLevel: row.experience_level ?? analysisJson.experienceLevel,
      industryTags: row.industry_tags ?? analysisJson.industryTags,
      trajectory: row.trajectory ?? analysisJson.trajectory,
      atsScore: Number(analysisJson.atsScore ?? 50),
      sectionScore: Number(analysisJson.sectionScore ?? 50),
    };
  }

  private async safeAtsScore(
    job: JobRecommendationRow,
    resumeAnalysis: Record<string, unknown>,
  ): Promise<AtsScoreResponse> {
    try {
      return await this.ats.scoreAgainstJob({
        resumeAnalysis,
        jobTitle: job.title,
        jobDescription: job.description,
        requiredSkills: job.required_skills ?? [],
      });
    } catch (error: any) {
      this.logger.warn(
        `[recommendations] ATS scoring fallback for job=${job.id}: ${error.message}`,
      );

      const resumeSkills = this.cleanStringArray(
        resumeAnalysis.topSkills ?? resumeAnalysis.skills,
      ).map((skill) => skill.toLowerCase());

      const required = this.cleanStringArray(job.required_skills).map((skill) =>
        skill.toLowerCase(),
      );

      const matched = required.filter((skill) => resumeSkills.includes(skill));
      const missing = required.filter((skill) => !resumeSkills.includes(skill));

      const score = required.length
        ? Math.round((matched.length / required.length) * 100)
        : 50;

      return {
        atsScore: score,
        recommendation: score >= 75 ? 'SHORTLIST' : score >= 55 ? 'REVIEW' : 'REJECT',
        matchedSkills: matched,
        missingSkills: missing,
        reason: 'Fallback score generated by NestJS because Python ATS service was unavailable.',
        breakdown: {
          skillScore: score,
          baseAts: Number(resumeAnalysis.atsScore ?? 50),
          sectionScore: Number(resumeAnalysis.sectionScore ?? 50),
          titleScore: 50,
        },
      };
    }
  }

  private mapRecommendation(
    job: JobRecommendationRow,
    matchScore: number,
    atsResult: AtsScoreResponse,
    profile: CandidateProfileRow,
  ): JobRecommendation {
    return {
      id: job.id,
      source: job.source,
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.work_mode,
      employmentType: job.employment_type,
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      salaryCurrency: job.salary_currency,
      requiredSkills: job.required_skills ?? [],
      description: job.description,
      postedAt: job.published_at ?? job.created_at,
      applyUrl: job.apply_url,
      recruiterName: job.recruiter_name,
      applicantCount: job.applicant_count,
      status: job.status,

      matchScore,
      atsScore: atsResult.atsScore,
      atsRecommendation: atsResult.recommendation,
      matchedSkills: atsResult.matchedSkills ?? [],
      missingSkills: atsResult.missingSkills ?? [],
      matchReason: this.buildMatchReason(job, profile, atsResult),
      atsReason: atsResult.reason,
    };
  }

  private buildMatchReason(
    job: JobRecommendationRow,
    profile: CandidateProfileRow,
    atsResult: AtsScoreResponse,
  ): string {
    const reasons: string[] = [];

    if (atsResult.matchedSkills?.length) {
      reasons.push(`matches ${atsResult.matchedSkills.slice(0, 4).join(', ')}`);
    }

    const targetRoles = this.cleanStringArray(profile.target_roles);

    if (
      targetRoles.some((role) =>
        job.title.toLowerCase().includes(role.toLowerCase()),
      )
    ) {
      reasons.push('matches your target role');
    }

    if (atsResult.recommendation === 'SHORTLIST') {
      reasons.push('strong ATS fit');
    }

    return reasons.length
      ? `Recommended because it ${reasons.join(', ')}.`
      : 'Recommended from your analysed resume profile.';
  }

  private cleanStringArray(value?: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private extractSkillsFromJson(
    skillsJson: unknown,
    topSkills: string[] | null,
  ): string[] {
    if (Array.isArray(skillsJson)) {
      const flat = skillsJson
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'name' in item) {
            return String((item as { name?: unknown }).name ?? '');
          }
          return '';
        })
        .map((item) => item.trim())
        .filter(Boolean);

      if (flat.length) return flat;
    }

    return this.cleanStringArray(topSkills);
  }
}