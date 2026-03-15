/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService,
  ) {}

  // ── GET profile ──────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Auto-create empty profile on first access — no 404 for new users
      return this.prisma.candidateProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  // ── GET profile with enriched resume data ────────────────────────────────

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    // Fetch latest analysis if activeResumeId exists
    let analysis = null;
    if (profile.activeResumeId) {
      const { rows } = await this.db.query(
        `SELECT ra.*
         FROM resume_analyses ra
         WHERE ra.resume_id = $1
           AND ra.status = 'completed'
         ORDER BY ra.created_at DESC
         LIMIT 1`,
        [profile.activeResumeId],
      );
      analysis = rows[0] || null;
    }

    // Fetch application stats
    const { rows: appStats } = await this.db.query(
      `SELECT
         COUNT(*)                                            AS total,
         COUNT(*) FILTER (WHERE status = 'applied')         AS applied,
         COUNT(*) FILTER (WHERE status = 'reviewed')        AS reviewed,
         COUNT(*) FILTER (WHERE status = 'shortlisted')     AS shortlisted,
         COUNT(*) FILTER (WHERE status = 'interview')       AS interview,
         COUNT(*) FILTER (WHERE status = 'offered')         AS offered,
         COUNT(*) FILTER (WHERE status = 'rejected')        AS rejected
       FROM applications
       WHERE candidate_id = $1`,
      [userId],
    );

    // Fetch recent applications with job details
    const { rows: recentApps } = await this.db.query(
      `SELECT a.id, a.status, a.match_score, a.applied_at,
              j.title, j.company, j.location, j.work_mode,
              j.salary_min, j.salary_max, j.salary_currency
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.candidate_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 5`,
      [userId],
    );

    return {
      ...profile,
      analysis,
      stats:              appStats[0] || {},
      recentApplications: recentApps,
    };
  }

  // ── UPDATE profile — partial, user fields only ──────────────────────────

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    // Ensure profile exists first
    await this.getProfile(userId);

    const updated = await this.prisma.candidateProfile.update({
      where: { userId },
      data: {
        ...(dto.headline           !== undefined && { headline: dto.headline }),
        ...(dto.bio                !== undefined && { bio: dto.bio }),
        ...(dto.location           !== undefined && { location: dto.location }),
        ...(dto.phone              !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl           !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.availability       !== undefined && { availability: dto.availability }),
        ...(dto.targetRoles        !== undefined && { targetRoles: dto.targetRoles }),
        ...(dto.targetIndustries   !== undefined && { targetIndustries: dto.targetIndustries }),
        ...(dto.employmentTypes    !== undefined && { employmentTypes: dto.employmentTypes }),
        ...(dto.workMode           !== undefined && { workMode: dto.workMode }),
        ...(dto.salaryMin          !== undefined && { salaryMin: dto.salaryMin }),
        ...(dto.salaryMax          !== undefined && { salaryMax: dto.salaryMax }),
        ...(dto.salaryCurrency     !== undefined && { salaryCurrency: dto.salaryCurrency }),
        ...(dto.salaryNegotiable   !== undefined && { salaryNegotiable: dto.salaryNegotiable }),
        ...(dto.willingToRelocate  !== undefined && { willingToRelocate: dto.willingToRelocate }),
        ...(dto.preferredLocations !== undefined && { preferredLocations: dto.preferredLocations }),
        ...(dto.isVisible          !== undefined && { isVisible: dto.isVisible }),
        lastActiveAt: new Date(),
      },
    });

    this.logger.log(`Candidate profile updated: ${userId}`);
    return updated;
  }

  // ── GET profile completion breakdown ─────────────────────────────────────

  async getCompletionDetails(userId: string) {
    const profile = await this.getProfile(userId);

    const checks = [
      { field: 'Full Name',          done: true },
      { field: 'Headline',           done: !!profile.headline },
      { field: 'Bio / Summary',      done: !!profile.bio },
      { field: 'Location',           done: !!profile.location },
      { field: 'Phone',              done: !!profile.phone },
      { field: 'Target Roles',       done: profile.targetRoles?.length > 0 },
      { field: 'Work Mode',          done: !!profile.workMode },
      { field: 'Resume Uploaded',    done: !!profile.activeResumeId },
      { field: 'Skills (from resume)', done: profile.topSkills?.length > 0 },
      { field: 'Salary Expectation', done: !!profile.salaryMin || !!profile.salaryMax },
    ];

    const completed = checks.filter(c => c.done).length;
    const score = Math.round((completed / checks.length) * 100);

    return { score, checks, total: checks.length, completed };
  }
}