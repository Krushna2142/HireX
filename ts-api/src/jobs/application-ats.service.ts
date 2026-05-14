/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { AtsService, AtsScoreResponse } from '../ats/ats.service';

type ApplicationAtsRow = {
  id: string;
  job_id: string;
  candidate_user_id: string;
  resume_id: string | null;
  status: string;
  job_title: string;
  job_description: string | null;
  required_skills: string[] | null;
  company_name: string | null;
  recruiter_user_id: string;
};

type ResumeAnalysisRow = {
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
};

@Injectable()
export class ApplicationAtsService {
  private readonly logger = new Logger(ApplicationAtsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ats: AtsService,
  ) {}

  async runApplicationAtsCheck(applicationId: string, recruiterUserId: string) {
    const application = await this.getApplicationForRecruiter(
      applicationId,
      recruiterUserId,
    );

    const resumeAnalysis = await this.getBestResumeAnalysis(
      application.candidate_user_id,
      application.resume_id,
    );

    if (!resumeAnalysis) {
      throw new BadRequestException(
        'Candidate resume is not analysed yet. Ask candidate to analyse resume first.',
      );
    }

    const resumePayload = this.buildResumePayload(resumeAnalysis);
    const requiredSkills = this.cleanStringArray(application.required_skills);

    const atsResult = await this.scoreWithPython(application, resumePayload, requiredSkills);

    const { rows } = await this.db.query(
      `
      UPDATE job_applications
      SET
        ats_score = $1,
        ats_recommendation = $2,
        ats_matched_skills = $3::text[],
        ats_missing_skills = $4::text[],
        ats_reason = $5,
        ats_breakdown = $6::jsonb,
        ats_checked_at = NOW(),
        match_score = $1,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [
        atsResult.atsScore,
        atsResult.recommendation,
        atsResult.matchedSkills ?? [],
        atsResult.missingSkills ?? [],
        atsResult.reason ?? '',
        JSON.stringify(atsResult.breakdown ?? {}),
        applicationId,
      ],
    );

    return {
      application: rows[0],
      ats: {
        atsScore: atsResult.atsScore,
        recommendation: atsResult.recommendation,
        matchedSkills: atsResult.matchedSkills ?? [],
        missingSkills: atsResult.missingSkills ?? [],
        reason: atsResult.reason ?? '',
        breakdown: atsResult.breakdown ?? {},
      },
    };
  }

  private async getApplicationForRecruiter(
    applicationId: string,
    recruiterUserId: string,
  ): Promise<ApplicationAtsRow> {
    const { rows } = await this.db.query<ApplicationAtsRow>(
      `
      SELECT
        a.id,
        a.job_id,
        a.candidate_user_id,
        a.resume_id,
        a.status::text AS status,
        j.title AS job_title,
        COALESCE(j.description, '') AS job_description,
        COALESCE(j.required_skills, ARRAY[]::text[]) AS required_skills,
        j.company_name,
        j.recruiter_user_id
      FROM job_applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.id = $1
        AND j.recruiter_user_id = $2
      LIMIT 1
      `,
      [applicationId, recruiterUserId],
    );

    if (!rows.length) {
      throw new NotFoundException(
        'Application not found, or this recruiter does not own the related job.',
      );
    }

    return rows[0];
  }

  private async getBestResumeAnalysis(
    candidateUserId: string,
    applicationResumeId: string | null,
  ): Promise<ResumeAnalysisRow | null> {
    if (applicationResumeId) {
      const { rows } = await this.db.query<ResumeAnalysisRow>(
        `
        SELECT
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
          ra.status::text AS status
        FROM resume_analyses ra
        JOIN resumes r ON r.id = ra.resume_id
        WHERE r.user_id = $1
          AND r.id = $2
          AND ra.status::text IN ('COMPLETED', 'completed', 'ANALYZED', 'analyzed')
        ORDER BY ra.processed_at DESC NULLS LAST, ra.created_at DESC NULLS LAST
        LIMIT 1
        `,
        [candidateUserId, applicationResumeId],
      );

      if (rows[0]) return rows[0];
    }

    const { rows } = await this.db.query<ResumeAnalysisRow>(
      `
      SELECT
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
        ra.status::text AS status
      FROM resume_analyses ra
      JOIN resumes r ON r.id = ra.resume_id
      WHERE r.user_id = $1
        AND ra.status::text IN ('COMPLETED', 'completed', 'ANALYZED', 'analyzed')
      ORDER BY ra.processed_at DESC NULLS LAST, ra.created_at DESC NULLS LAST
      LIMIT 1
      `,
      [candidateUserId],
    );

    return rows[0] ?? null;
  }

  private async scoreWithPython(
    application: ApplicationAtsRow,
    resumePayload: Record<string, unknown>,
    requiredSkills: string[],
  ): Promise<AtsScoreResponse> {
    try {
      return await this.ats.scoreAgainstJob({
        resumeAnalysis: resumePayload,
        jobTitle: application.job_title,
        jobDescription: application.job_description ?? '',
        requiredSkills,
      });
    } catch (error) {
      this.logger.error(
        `Python ATS failed for application=${application.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw error;
    }
  }

  private buildResumePayload(row: ResumeAnalysisRow): Record<string, unknown> {
    const skills = this.extractSkills(row.skills, row.top_skills);
    const topSkills = this.cleanStringArray(row.top_skills).length
      ? this.cleanStringArray(row.top_skills)
      : skills;

    return {
      resumeId: row.resume_id,
      rawTextPreview: row.raw_text ?? '',
      personalInfo: row.personal_info ?? {},
      workExperience: row.work_experience ?? [],
      education: row.education ?? [],
      skills,
      topSkills,
      projects: row.projects ?? [],
      certifications: row.certifications ?? [],
      experienceYears: row.experience_years ?? 0,
      experienceLevel: row.experience_level ?? 'fresher',
      industryTags: this.cleanStringArray(row.industry_tags),
      trajectory: row.trajectory ?? '',
    };
  }

  private extractSkills(skillsJson: unknown, topSkills: string[] | null): string[] {
    if (Array.isArray(skillsJson)) {
      const skills = skillsJson
        .map((item) => {
          if (typeof item === 'string') return item;

          if (item && typeof item === 'object' && 'name' in item) {
            return String((item as { name?: unknown }).name ?? '');
          }

          return '';
        })
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      if (skills.length) return Array.from(new Set(skills));
    }

    return this.cleanStringArray(topSkills);
  }

  private cleanStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }
}