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
  top_skills: string[] | null;
  experience_level: string | null;
  experience_years: number | null;
  current_title: string | null;
  target_industries: string[] | null;
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
  status: string;
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
    limit = 12,
  ): Promise<{
    recommendations: JobRecommendation[];
    reason?: string;
    profile?: object;
  }> {
    const safeLimit = Math.min(Math.max(limit || 12, 1), 30);

    const latestAnalysis = await this.fetchLatestResumeAnalysis(candidateId);

    if (!latestAnalysis) {
      return {
        recommendations: [],
        reason: 'Upload and analyse your resume to unlock recommendations.',
      };
    }

    const profile = await this.fetchCandidateProfile(candidateId);

    const resumeAnalysisPayload = this.buildResumeAnalysisPayload(latestAnalysis);

    const resumeSkills = this.cleanStringArray(
      resumeAnalysisPayload.topSkills ?? resumeAnalysisPayload.skills,
    );

    if (!resumeSkills.length) {
      return {
        recommendations: [],
        reason: 'No skills found in analysed resume. Re-run resume analysis.',
      };
    }

    const jobs = await this.fetchPublishedJobs(safeLimit * 3);

    if (!jobs.length) {
      return {
        recommendations: [],
        reason: 'No jobs are available in PostgreSQL yet. Sync or add jobs first.',
        profile: {
          skills: resumeSkills,
          experienceLevel:
            profile?.experience_level ??
            latestAnalysis.experience_level ??
            'fresher',
          experienceYears:
            profile?.experience_years ??
            latestAnalysis.experience_years ??
            0,
        },
      };
    }

    const recommendations = await Promise.all(
      jobs.map(async (job) => {
        const atsResult = await this.safeAtsScore(job, resumeAnalysisPayload);

        const skillMatchScore = this.calculateSkillMatchScore(
          resumeSkills,
          job.required_skills ?? [],
          job.title,
          job.description,
        );

        const finalMatch = Math.round(
          Math.max(skillMatchScore, atsResult.atsScore * 0.88),
        );

        return this.mapRecommendation(job, finalMatch, atsResult);
      }),
    );

    const sorted = recommendations
      .sort((a, b) => {
        if (b.atsScore !== a.atsScore) return b.atsScore - a.atsScore;
        return b.matchScore - a.matchScore;
      })
      .slice(0, safeLimit);

    return {
      recommendations: sorted,
      profile: {
        skills: resumeSkills,
        experienceLevel:
          profile?.experience_level ??
          latestAnalysis.experience_level ??
          'fresher',
        experienceYears:
          profile?.experience_years ??
          latestAnalysis.experience_years ??
          0,
        currentTitle: profile?.current_title ?? null,
        industryTags:
          this.cleanStringArray(profile?.target_industries).length > 0
            ? this.cleanStringArray(profile?.target_industries)
            : this.cleanStringArray(latestAnalysis.industry_tags),
      },
    };
  }

  async getSkillGapAnalysis(candidateId: string): Promise<SkillGapAnalysis | null> {
    const latestAnalysis = await this.fetchLatestResumeAnalysis(candidateId);

    if (!latestAnalysis) return null;

    const resumeAnalysisPayload = this.buildResumeAnalysisPayload(latestAnalysis);
    const userSkills = this.cleanStringArray(
      resumeAnalysisPayload.topSkills ?? resumeAnalysisPayload.skills,
    );

    if (!userSkills.length) {
      return {
        userSkills: [],
        topDemandedSkills: [],
        skillGaps: [],
        matchedSkills: [],
        coveragePercent: 0,
      };
    }

    try {
      const { rows } = await this.db.query<SkillDemandRow>(
        `SELECT
           skill,
           COUNT(*)::text AS demand_count,
           lower(skill) = ANY($1::text[]) AS candidate_has
         FROM jobs
         CROSS JOIN LATERAL unnest(COALESCE(required_skills, ARRAY[]::text[])) AS skill
         WHERE status::text IN ('PUBLISHED', 'published', 'active', 'ACTIVE')
         GROUP BY skill, candidate_has
         ORDER BY COUNT(*) DESC
         LIMIT 20`,
        [userSkills.map((skill) => skill.toLowerCase())],
      );

      const gaps = rows.filter((row) => !row.candidate_has);
      const matches = rows.filter((row) => row.candidate_has);

      return {
        userSkills,
        topDemandedSkills: rows,
        skillGaps: gaps.slice(0, 8),
        matchedSkills: matches,
        coveragePercent:
          rows.length > 0 ? Math.round((matches.length / rows.length) * 100) : 0,
      };
    } catch (error: any) {
      this.logger.warn(`[recommendations] skill gap query failed: ${error.message}`);

      return {
        userSkills,
        topDemandedSkills: [],
        skillGaps: [],
        matchedSkills: [],
        coveragePercent: 0,
      };
    }
  }

  private async fetchCandidateProfile(
    userId: string,
  ): Promise<CandidateProfileRow | null> {
    try {
      const { rows } = await this.db.query<CandidateProfileRow>(
        `SELECT
           top_skills,
           experience_level,
           experience_years,
           current_title,
           target_industries
         FROM jobseeker_profiles
         WHERE user_id = $1
         LIMIT 1`,
        [userId],
      );

      return rows[0] ?? null;
    } catch (error: any) {
      this.logger.warn(
        `[recommendations] jobseeker profile query failed, using resume analysis only: ${error.message}`,
      );

      return null;
    }
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
         ra.status::text AS status,
         r.analysis_json
       FROM resume_analyses ra
       JOIN resumes r ON r.id = ra.resume_id
       WHERE r.user_id = $1
         AND ra.status::text IN ('COMPLETED', 'completed', 'analyzed', 'ANALYZED')
       ORDER BY ra.processed_at DESC NULLS LAST, r.analyzed_at DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );

    return rows[0] ?? null;
  }

  private async fetchPublishedJobs(limit: number): Promise<JobRecommendationRow[]> {
    const { rows } = await this.db.query<JobRecommendationRow>(
      `SELECT
         id,
         COALESCE(source, 'serpapi')::text AS source,
         title,
         COALESCE(company_name, company, 'Unknown company') AS company,
         location,
         work_mode,
         employment_type,
         salary_min,
         salary_max,
         COALESCE(salary_currency, 'INR') AS salary_currency,
         COALESCE(required_skills, ARRAY[]::text[]) AS required_skills,
         COALESCE(description, '') AS description,
         created_at,
         published_at,
         apply_url,
         status::text AS status
       FROM jobs
       WHERE status::text IN ('PUBLISHED', 'published', 'active', 'ACTIVE')
       ORDER BY
         published_at DESC NULLS LAST,
         created_at DESC
       LIMIT $1`,
      [limit],
    );

    return rows;
  }

  private buildResumeAnalysisPayload(row: ResumeAnalysisRow): Record<string, unknown> {
    const analysisJson = row.analysis_json ?? {};

    const skills = this.extractSkillsFromJson(row.skills, row.top_skills);
    const topSkills = this.cleanStringArray(row.top_skills).length
      ? this.cleanStringArray(row.top_skills)
      : skills;

    return {
      ...analysisJson,
      rawTextPreview: row.raw_text ?? analysisJson.rawTextPreview,
      personalInfo: row.personal_info ?? analysisJson.personalInfo,
      workExperience: row.work_experience ?? analysisJson.workExperience,
      education: row.education ?? analysisJson.education,
      skills,
      topSkills,
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
        `[recommendations] Python ATS scoring failed for job=${job.id}: ${error.message}`,
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
        : this.calculateSkillMatchScore(
            resumeSkills,
            [],
            job.title,
            job.description,
          );

      return {
        atsScore: score,
        recommendation:
          score >= 75 ? 'SHORTLIST' : score >= 55 ? 'REVIEW' : 'REJECT',
        matchedSkills: matched,
        missingSkills: missing,
        reason:
          'Generated by JobCrawler fallback matcher because Python ATS scoring was temporarily unavailable.',
        breakdown: {
          skillScore: score,
          baseAts: Number(resumeAnalysis.atsScore ?? 50),
          sectionScore: Number(resumeAnalysis.sectionScore ?? 50),
          titleScore: 50,
        },
      };
    }
  }

  private calculateSkillMatchScore(
    resumeSkillsInput: string[],
    requiredSkillsInput: string[],
    title?: string | null,
    description?: string | null,
  ): number {
    const resumeSkills = resumeSkillsInput
      .map((skill) => skill.toLowerCase().trim())
      .filter(Boolean);

    const requiredSkills = requiredSkillsInput
      .map((skill) => skill.toLowerCase().trim())
      .filter(Boolean);

    const text = `${title ?? ''} ${description ?? ''}`.toLowerCase();

    if (requiredSkills.length) {
      const matched = requiredSkills.filter((skill) => resumeSkills.includes(skill));
      const directScore = Math.round((matched.length / requiredSkills.length) * 100);

      const textHits = resumeSkills.filter((skill) => text.includes(skill)).length;
      const textScore = Math.min(100, textHits * 12);

      return Math.max(directScore, textScore);
    }

    const hits = resumeSkills.filter((skill) => text.includes(skill)).length;

    return Math.min(100, Math.max(35, hits * 12));
  }

  private mapRecommendation(
    job: JobRecommendationRow,
    matchScore: number,
    atsResult: AtsScoreResponse,
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
      recruiterName: null,
      applicantCount: '0',
      status: job.status,

      matchScore,
      atsScore: atsResult.atsScore,
      atsRecommendation: atsResult.recommendation,
      matchedSkills: atsResult.matchedSkills ?? [],
      missingSkills: atsResult.missingSkills ?? [],
      matchReason: this.buildMatchReason(job, atsResult),
      atsReason: atsResult.reason,
    };
  }

  private buildMatchReason(
    job: JobRecommendationRow,
    atsResult: AtsScoreResponse,
  ): string {
    const reasons: string[] = [];

    if (atsResult.matchedSkills?.length) {
      reasons.push(`matches ${atsResult.matchedSkills.slice(0, 4).join(', ')}`);
    }

    if (atsResult.recommendation === 'SHORTLIST') {
      reasons.push('has strong ATS fit');
    }

    if (atsResult.recommendation === 'REVIEW') {
      reasons.push('has moderate ATS fit and should be reviewed');
    }

    return reasons.length
      ? `Recommended because it ${reasons.join(', ')}.`
      : 'Recommended from your analysed resume profile and available job data.';
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