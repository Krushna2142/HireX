/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus, ResumeAnalysisStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.jobseekerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.prisma.jobseekerProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    const analysis = profile.activeResumeId
      ? await this.prisma.resumeAnalysis.findFirst({
          where: {
            resumeId: profile.activeResumeId,
            status: ResumeAnalysisStatus.COMPLETED,
          },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    const applications = await this.prisma.jobApplication.findMany({
      where: { candidateUserId: userId },
      include: { job: true },
      orderBy: { appliedAt: 'desc' },
    });

    const stats = {
      total: applications.length,
      applied: 0,
      reviewed: 0,
      shortlisted: 0,
      interview: 0,
      offered: 0,
      rejected: 0,
    };

    for (const app of applications) {
      const bucket = this.statusBucket(app.status);
      stats[bucket] += 1;
    }

    const recentApplications = applications.slice(0, 5).map((app) => ({
      id: app.id,
      status: app.status.toLowerCase(),
      match_score: app.matchScore,
      applied_at: app.appliedAt,
      title: app.job.title,
      company: app.job.companyName,
      location: app.job.location,
      work_mode: app.job.workMode,
      salary_min: app.job.salaryMin,
      salary_max: app.job.salaryMax,
      salary_currency: app.job.salaryCurrency,
    }));

    return {
      ...profile,
      analysis,
      stats,
      recentApplications,
    };
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    await this.getProfile(userId);

    const updated = await this.prisma.jobseekerProfile.update({
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

  async getCompletionDetails(userId: string) {
    const profile = await this.getProfile(userId);

    const checks = [
      { field: 'Full Name',            done: true },
      { field: 'Headline',             done: !!profile.headline },
      { field: 'Bio / Summary',        done: !!profile.bio },
      { field: 'Location',             done: !!profile.location },
      { field: 'Phone',                done: !!profile.phone },
      { field: 'Target Roles',         done: profile.targetRoles?.length > 0 },
      { field: 'Work Mode',            done: !!profile.workMode },
      { field: 'Resume Uploaded',      done: !!profile.activeResumeId },
      { field: 'Skills (from resume)', done: profile.topSkills?.length > 0 },
      { field: 'Salary Expectation',   done: !!profile.salaryMin || !!profile.salaryMax },
    ];

    const completed = checks.filter(c => c.done).length;
    const score = Math.round((completed / checks.length) * 100);

    return { score, checks, total: checks.length, completed };
  }

  private statusBucket(status: ApplicationStatus): keyof {
    applied: number;
    reviewed: number;
    shortlisted: number;
    interview: number;
    offered: number;
    rejected: number;
  } {
    if (status === ApplicationStatus.SHORTLISTED) return 'shortlisted';
    if (status === ApplicationStatus.OFFERED || status === ApplicationStatus.HIRED) return 'offered';
    if (status === ApplicationStatus.REJECTED) return 'rejected';
    if (status.includes('INTERVIEW')) return 'interview';
    if (status === ApplicationStatus.UNDER_REVIEW || status === ApplicationStatus.FINAL_REVIEW) return 'reviewed';
    return 'applied';
  }
}
