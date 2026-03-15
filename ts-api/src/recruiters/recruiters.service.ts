/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Injectable()
export class RecruitersService {
  private readonly logger = new Logger(RecruitersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService,
  ) {}

  // ── GET profile ──────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.prisma.recruiterProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  // ── GET enriched profile with live pipeline stats ────────────────────────

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    // Aggregate live hiring pipeline stats across all active jobs
    const { rows: pipeline } = await this.db.query(
      `SELECT
         COUNT(DISTINCT j.id)                                    AS total_jobs,
         COUNT(a.id)                                             AS total_applications,
         COUNT(a.id) FILTER (WHERE a.status = 'applied')        AS new_applicants,
         COUNT(a.id) FILTER (WHERE a.status = 'shortlisted')    AS shortlisted,
         COUNT(a.id) FILTER (WHERE a.status = 'interview')      AS in_interview,
         COUNT(a.id) FILTER (WHERE a.status = 'offered')        AS offered,
         COUNT(a.id) FILTER (WHERE a.status = 'rejected')       AS rejected,
         COUNT(j.id) FILTER (WHERE j.status = 'active')         AS active_jobs,
         ROUND(
           CASE WHEN COUNT(a.id) FILTER (WHERE a.status = 'interview') > 0
             THEN COUNT(a.id) FILTER (WHERE a.status = 'offered')::NUMERIC
               / COUNT(a.id) FILTER (WHERE a.status = 'interview') * 100
             ELSE 0 END, 1
         )                                                       AS offer_rate,
         ROUND(
           AVG(
             EXTRACT(EPOCH FROM (a.updated_at - a.applied_at)) / 86400
           )::NUMERIC, 1
         )                                                       AS avg_days_to_hire
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1`,
      [userId],
    );

    // Recent applicants across all jobs
    const { rows: recentApplicants } = await this.db.query(
      `SELECT
         a.id, a.status, a.match_score, a.applied_at,
         u.full_name, u.email,
         cp.headline, cp.experience_level, cp.top_skills,
         j.title AS job_title
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 8`,
      [userId],
    );

    return {
      ...profile,
      pipeline:          pipeline[0] || {},
      recentApplicants,
      profileCompletion: this.computeCompletion(profile),
    };
  }

  // ── UPDATE profile ───────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    await this.getProfile(userId);

    const updated = await this.prisma.recruiterProfile.update({
      where: { userId },
      data: {
        ...(dto.title              !== undefined && { title: dto.title }),
        ...(dto.phone              !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl           !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.linkedinUrl        !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.companyName        !== undefined && { companyName: dto.companyName }),
        ...(dto.companySize        !== undefined && { companySize: dto.companySize }),
        ...(dto.companyIndustry    !== undefined && { companyIndustry: dto.companyIndustry }),
        ...(dto.companyWebsite     !== undefined && { companyWebsite: dto.companyWebsite }),
        ...(dto.companyLogoUrl     !== undefined && { companyLogoUrl: dto.companyLogoUrl }),
        ...(dto.companyDescription !== undefined && { companyDescription: dto.companyDescription }),
        ...(dto.companyLocation    !== undefined && { companyLocation: dto.companyLocation }),
        ...(dto.hiringRoles        !== undefined && { hiringRoles: dto.hiringRoles }),
        ...(dto.typicalStack       !== undefined && { typicalStack: dto.typicalStack }),
        ...(dto.hiringVolume       !== undefined && { hiringVolume: dto.hiringVolume }),
        ...(dto.openToRemote       !== undefined && { openToRemote: dto.openToRemote }),
        profileCompletion: this.computeCompletion({ ...dto }),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Recruiter profile updated: ${userId}`);
    return updated;
  }

  // ── Private: compute completion score ────────────────────────────────────

  private computeCompletion(profile: any): number {
    const checks = [
      !!profile.title,
      !!profile.phone,
      !!profile.linkedinUrl,
      !!profile.companyName,
      !!profile.companySize,
      !!profile.companyIndustry?.length,
      !!profile.companyWebsite,
      !!profile.companyDescription,
      !!profile.hiringRoles?.length,
      !!profile.typicalStack?.length,
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    );
  }
}