/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// ts-api/src/recruiters/recruiters.service.ts

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

type PipelineStats = {
  totalJobs: number;
  totalApplications: number;
  newApplicants: number;
  shortlisted: number;
  inInterview: number;
  offered: number;
  rejected: number;
  activeJobs: number;
  offerRate: number;
};

const EMPTY_PIPELINE: PipelineStats = {
  totalJobs: 0,
  totalApplications: 0,
  newApplicants: 0,
  shortlisted: 0,
  inInterview: 0,
  offered: 0,
  rejected: 0,
  activeJobs: 0,
  offerRate: 0,
};

@Injectable()
export class RecruitersService {
  private readonly logger = new Logger(RecruitersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly db: DatabaseService,
  ) {}

  async getProfile(userId: string) {
    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (existing) return existing;

    return this.prisma.recruiterProfile.create({
      data: {
        userId,
      },
    });
  }

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    const [pipeline, recentApplicants] = await Promise.all([
      this.getPipelineStats(userId),
      this.getRecentApplicants(userId),
    ]);

    return {
      ...profile,
      pipeline,
      recentApplicants,
    };
  }

  async updateProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    await this.getProfile(userId);

    const clean = this.cleanDto(dto);
    const profileCompletion = this.calculateCompletion(clean);

    const updated = await this.prisma.recruiterProfile.update({
      where: { userId },
      data: {
        ...clean,
        profileCompletion,
      },
    });

    const [pipeline, recentApplicants] = await Promise.all([
      this.getPipelineStats(userId),
      this.getRecentApplicants(userId),
    ]);

    return {
      ...updated,
      pipeline,
      recentApplicants,
    };
  }

  private cleanDto(dto: UpdateRecruiterProfileDto) {
    return {
      title: this.nullableString(dto.title),
      photoUrl: this.nullableString(dto.photoUrl),
      phone: this.nullableString(dto.phone),
      linkedinUrl: this.nullableString(dto.linkedinUrl),

      companyName: this.nullableString(dto.companyName),
      companySize: this.nullableString(dto.companySize),
      companyIndustry: this.cleanStringArray(dto.companyIndustry),
      companyWebsite: this.nullableString(dto.companyWebsite),
      companyLogoUrl: this.nullableString(dto.companyLogoUrl),
      companyDescription: this.nullableString(dto.companyDescription),
      companyLocation: this.nullableString(dto.companyLocation),

      hiringRoles: this.cleanStringArray(dto.hiringRoles),
      typicalStack: this.cleanStringArray(dto.typicalStack),
      hiringVolume: this.nullableString(dto.hiringVolume),
      openToRemote: typeof dto.openToRemote === 'boolean' ? dto.openToRemote : true,
    };
  }

  private calculateCompletion(input: ReturnType<RecruitersService['cleanDto']>) {
    const checks = [
      input.title,
      input.phone,
      input.linkedinUrl,
      input.companyName,
      input.companySize,
      input.companyWebsite,
      input.companyDescription,
      input.companyLocation,
      input.hiringVolume,
      input.companyIndustry.length > 0,
      input.hiringRoles.length > 0,
      input.typicalStack.length > 0,
    ];

    const completed = checks.filter(Boolean).length;

    return Math.round((completed / checks.length) * 100);
  }

  private async getPipelineStats(userId: string): Promise<PipelineStats> {
    try {
      const { rows } = await this.db.query<{
        total_jobs: string;
        total_applications: string;
        new_applicants: string;
        shortlisted: string;
        in_interview: string;
        offered: string;
        rejected: string;
        active_jobs: string;
        offer_rate: string;
      }>(
        `
        SELECT
          COUNT(DISTINCT j.id)::text AS total_jobs,
          COUNT(a.id)::text AS total_applications,

          COUNT(a.id) FILTER (
            WHERE a.status::text IN ('APPLIED', 'applied', 'UNDER_REVIEW', 'reviewing', 'reviewed')
          )::text AS new_applicants,

          COUNT(a.id) FILTER (
            WHERE a.status::text IN ('SHORTLISTED', 'shortlisted')
          )::text AS shortlisted,

          COUNT(a.id) FILTER (
            WHERE a.status::text IN (
              'INTERVIEW_SCHEDULED',
              'INTERVIEW_IN_PROGRESS',
              'INTERVIEW_PASSED',
              'INTERVIEW_FAILED',
              'interview'
            )
          )::text AS in_interview,

          COUNT(a.id) FILTER (
            WHERE a.status::text IN ('OFFERED', 'offered')
          )::text AS offered,

          COUNT(a.id) FILTER (
            WHERE a.status::text IN ('REJECTED', 'rejected')
          )::text AS rejected,

          COUNT(DISTINCT j.id) FILTER (
            WHERE j.status::text IN ('PUBLISHED', 'ACTIVE', 'active', 'published')
          )::text AS active_jobs,

          ROUND(
            CASE
              WHEN COUNT(a.id) FILTER (
                WHERE a.status::text IN (
                  'INTERVIEW_SCHEDULED',
                  'INTERVIEW_IN_PROGRESS',
                  'INTERVIEW_PASSED',
                  'INTERVIEW_FAILED',
                  'interview'
                )
              ) > 0
              THEN
                COUNT(a.id) FILTER (
                  WHERE a.status::text IN ('OFFERED', 'HIRED', 'offered', 'hired')
                )::numeric
                / COUNT(a.id) FILTER (
                  WHERE a.status::text IN (
                    'INTERVIEW_SCHEDULED',
                    'INTERVIEW_IN_PROGRESS',
                    'INTERVIEW_PASSED',
                    'INTERVIEW_FAILED',
                    'interview'
                  )
                )::numeric
                * 100
              ELSE 0
            END,
            1
          )::text AS offer_rate
        FROM jobs j
        LEFT JOIN job_applications a ON a.job_id = j.id
        WHERE j.recruiter_user_id = $1
        `,
        [userId],
      );

      const row = rows[0];

      if (!row) return EMPTY_PIPELINE;

      return {
        totalJobs: this.toNumber(row.total_jobs),
        totalApplications: this.toNumber(row.total_applications),
        newApplicants: this.toNumber(row.new_applicants),
        shortlisted: this.toNumber(row.shortlisted),
        inInterview: this.toNumber(row.in_interview),
        offered: this.toNumber(row.offered),
        rejected: this.toNumber(row.rejected),
        activeJobs: this.toNumber(row.active_jobs),
        offerRate: this.toNumber(row.offer_rate),
      };
    } catch (error) {
      this.logger.warn(
        `[recruiters/profile] pipeline stats failed, returning zeros: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return EMPTY_PIPELINE;
    }
  }

  private async getRecentApplicants(userId: string) {
    try {
      const { rows } = await this.db.query(
        `
        SELECT
          a.id,
          a.status::text AS status,
          a.created_at,
          j.title AS job_title,
          j.company_name,
          u.full_name AS candidate_name,
          u.email AS candidate_email
        FROM job_applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN users u ON u.id = a.candidate_user_id
        WHERE j.recruiter_user_id = $1
        ORDER BY a.created_at DESC
        LIMIT 8
        `,
        [userId],
      );

      return rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        jobTitle: row.job_title,
        companyName: row.company_name,
        candidateName: row.candidate_name,
        candidateEmail: row.candidate_email,
      }));
    } catch (error) {
      this.logger.warn(
        `[recruiters/profile] recent applicants failed, returning empty list: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return [];
    }
  }

  private nullableString(value?: string | null) {
    const clean = String(value ?? '').trim();
    return clean.length ? clean : null;
  }

  private cleanStringArray(value?: unknown) {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toNumber(value: unknown) {
    const num = Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
  }
}