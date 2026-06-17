/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ts-api/src/ats/ats.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ATS_JOB,
  ATS_QUEUE,
  AtsCheckResult,
  AtsQueuePayload,
  AtsRecommendation,
} from './ats.types';

export interface AtsScoreRequest {
  resumeAnalysis: Record<string, unknown>;
  jobTitle?: string;
  jobDescription?: string;
  requiredSkills?: string[];
}

export interface AtsScoreResponse {
  atsScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
  breakdown: Record<string, any>;
}

type ApplicationContext = Awaited<
  ReturnType<AtsService['getApplicationContext']>
>;

type AtsPayload = {
  applicationId: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    profileSkills: string[];
    experienceYears: number;
  };
  job: {
    id: string;
    title: string;
    description: string;
    requiredSkills: string[];
    experienceMin: number;
    experienceMax: number | null;
    industry: string | null;
    companyName: string | null;
  };
  resume: {
    id: string | null;
    fileName: string;
    text: string;
    rawText: string;
    extractedText: string;
    skills: string[];
    projects: any[];
    experience: any[];
    education: any[];
    certifications: any[];
    analysisJson: any;
  };
  resumeAnalysis: Record<string, any>;
  scoringPolicy: {
    requiredSkillMatch: number;
    semanticMatch: number;
    projectRelevance: number;
    experienceRelevance: number;
    roleTitleRelevance: number;
    sectionCompleteness: number;
    keywordPlacement: number;
    formattingReadability: number;
  };
};

@Injectable()
export class AtsService {
  private readonly logger = new Logger(AtsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(ATS_QUEUE) private readonly atsQueue: Queue<AtsQueuePayload>,
  ) {}

  async scoreAgainstJob(payload: AtsScoreRequest): Promise<AtsScoreResponse> {
    const resumeAnalysis = payload.resumeAnalysis ?? {};

    const normalizedPayload: AtsPayload = {
      applicationId: 'legacy-score-against-job',
      candidate: {
        id: 'legacy-candidate',
        name: 'Candidate',
        email: '',
        profileSkills: this.extractSkillsDeep(resumeAnalysis),
        experienceYears: this.extractExperienceYears(resumeAnalysis),
      },
      job: {
        id: 'legacy-job',
        title: payload.jobTitle ?? '',
        description: payload.jobDescription ?? '',
        requiredSkills: this.toStringArray(payload.requiredSkills ?? []),
        experienceMin: 0,
        experienceMax: null,
        industry: null,
        companyName: null,
      },
      resume: {
        id: 'legacy-resume',
        fileName: '',
        text: this.buildSearchText(resumeAnalysis),
        rawText: this.buildSearchText(resumeAnalysis),
        extractedText: this.buildSearchText(resumeAnalysis),
        skills: this.extractSkillsDeep(resumeAnalysis),
        projects: this.toArray((resumeAnalysis as any).projects),
        experience: this.toArray(
          (resumeAnalysis as any).workExperience ??
            (resumeAnalysis as any).experience,
        ),
        education: this.toArray((resumeAnalysis as any).education),
        certifications: this.toArray((resumeAnalysis as any).certifications),
        analysisJson: resumeAnalysis,
      },
      resumeAnalysis: resumeAnalysis as Record<string, any>,
      scoringPolicy: this.defaultScoringPolicy(),
    };

    const result = await this.checkPythonPayloadOrFallback(normalizedPayload);

    return {
      atsScore: result.score,
      recommendation: this.toLegacyRecommendation(result.recommendation),
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      reason: result.reason,
      breakdown: {
        requiredSkillMatch: result.breakdown.requiredSkillMatch,
        semanticMatch: result.breakdown.semanticMatch,
        projectRelevance: result.breakdown.projectRelevance,
        experienceRelevance: result.breakdown.experienceRelevance,
        roleTitleRelevance: result.breakdown.roleTitleRelevance,
        sectionCompleteness: result.breakdown.sectionCompleteness,
        keywordPlacement: result.breakdown.keywordPlacement,
        formattingReadability: result.breakdown.formattingReadability,
        jdRoleFamily: result.breakdown.jdRoleFamily,
        evidence: result.breakdown.evidence,
        warnings: result.breakdown.warnings,
      },
    };
  }

  async getJobApplications(jobId: string, recruiterUserId: string) {
    await this.assertRecruiterOwnsJob(jobId, recruiterUserId);

    const applications = await this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: [{ atsScore: 'desc' }, { appliedAt: 'desc' }],
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            profile: {
              select: {
                phone: true,
                location: true,
                linkedinUrl: true,
                githubUrl: true,
                websiteUrl: true,
              },
            },
            jobseekerProfile: {
              select: {
                headline: true,
                phone: true,
                location: true,
                topSkills: true,
                experienceYears: true,
                experienceLevel: true,
              },
            },
          },
        },
        resume: {
          select: {
            id: true,
            storageBucket: true,
            storagePath: true,
            originalFileName: true,
            mimeType: true,
            extractedText: true,
            analysisStatus: true,
            analysisJson: true,
            analyzedAt: true,
            resumeAnalysis: {
              select: {
                rawText: true,
                personalInfo: true,
                workExperience: true,
                education: true,
                skills: true,
                certifications: true,
                projects: true,
                experienceYears: true,
                experienceLevel: true,
                topSkills: true,
                industryTags: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            companyName: true,
            description: true,
            requiredSkills: true,
            experienceMin: true,
            experienceMax: true,
            industry: true,
            location: true,
            vacancyCount: true,
          } as any,
        },
        statusEvents: {
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
      },
    });

    return {
      jobId,
      total: applications.length,
      applicants: applications.map((app) => ({
        id: app.id,
        status: app.status,
        applied_at: app.appliedAt,
        match_score: app.matchScore,

        ats_status: app.atsStatus ?? 'NOT_QUEUED',
        ats_score: app.atsScore,
        ats_recommendation: app.atsRecommendation,
        ats_matched_skills: app.atsMatchedSkills ?? [],
        ats_missing_skills: app.atsMissingSkills ?? [],
        ats_reason: app.atsReason,
        ats_breakdown: app.atsBreakdown,
        ats_error: app.atsError,
        ats_checked_at: app.atsCheckedAt,

        candidate: {
          id: app.candidate.id,
          name: app.candidate.fullName ?? app.candidate.email,
          fullName: app.candidate.fullName,
          full_name: app.candidate.fullName,
          email: app.candidate.email,
          avatarUrl: app.candidate.avatarUrl,
          phone:
            app.candidate.profile?.phone ??
            app.candidate.jobseekerProfile?.phone ??
            null,
          location:
            app.candidate.profile?.location ??
            app.candidate.jobseekerProfile?.location ??
            null,
          headline: app.candidate.jobseekerProfile?.headline ?? null,
          topSkills: app.candidate.jobseekerProfile?.topSkills ?? [],
          experienceYears:
            app.candidate.jobseekerProfile?.experienceYears ?? null,
          experienceLevel:
            app.candidate.jobseekerProfile?.experienceLevel ?? null,
          linkedin: app.candidate.profile?.linkedinUrl ?? null,
          github: app.candidate.profile?.githubUrl ?? null,
          portfolio: app.candidate.profile?.websiteUrl ?? null,
        },

        resume: app.resume
          ? {
              id: app.resume.id,
              fileName: app.resume.originalFileName,
              file_name: app.resume.originalFileName,
              storageBucket: app.resume.storageBucket,
              storagePath: app.resume.storagePath,
              storage_path: app.resume.storagePath,
              mimeType: app.resume.mimeType,
              analysisStatus: app.resume.analysisStatus,
              analyzedAt: app.resume.analyzedAt,
              extractedText: app.resume.extractedText,
              analysisJson: app.resume.analysisJson,
              resumeAnalysis: app.resume.resumeAnalysis,
              url: this.buildResumePublicUrl(
                app.resume.storageBucket,
                app.resume.storagePath,
              ),
              fileUrl: this.buildResumePublicUrl(
                app.resume.storageBucket,
                app.resume.storagePath,
              ),
              publicUrl: this.buildResumePublicUrl(
                app.resume.storageBucket,
                app.resume.storagePath,
              ),
            }
          : null,

        job: {
          id: app.job.id,
          title: app.job.title,
          companyName: app.job.companyName,
          company_name: app.job.companyName,
          requiredSkills: app.job.requiredSkills,
          vacancyCount: (app.job as any).vacancyCount ?? null,
        },

        events: app.statusEvents,
      })),
    };
  }

  async enqueueSingleApplication(applicationId: string, recruiterUserId: string) {
    const context = await this.getApplicationContext(applicationId);
    this.assertRecruiterAccess(context, recruiterUserId);

    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        atsStatus: 'QUEUED',
        atsError: null,
        atsQueuedAt: new Date(),
      } as any,
    });

    const queueJob = await this.atsQueue.add(
      ATS_JOB.CHECK_APPLICATION,
      {
        applicationId,
        jobId: context.job.id,
        recruiterUserId,
        source: 'single',
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 60 * 60 * 24, count: 5000 },
        removeOnFail: { age: 60 * 60 * 24 * 7, count: 5000 },
      },
    );

    await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { atsQueueJobId: String(queueJob.id) } as any,
    });

    return {
      applicationId,
      queueJobId: queueJob.id,
      status: 'QUEUED',
    };
  }

  async enqueueBulkForJob(
    jobId: string,
    recruiterUserId: string,
    vacancyCount = 1,
  ) {
    await this.assertRecruiterOwnsJob(jobId, recruiterUserId);

    const applications = await this.prisma.jobApplication.findMany({
      where: {
        jobId,
        status: {
          notIn: ['REJECTED', 'HIRED', 'WITHDRAWN'],
        } as any,
      },
      select: { id: true },
      orderBy: { appliedAt: 'asc' },
    });

    if (!applications.length) {
      throw new BadRequestException('No active applications found for this job.');
    }

    const shortlistTarget = this.getShortlistTarget(
      vacancyCount,
      applications.length,
    );

    const batchRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO ats_bulk_batches (
        job_id,
        recruiter_user_id,
        status,
        total_count,
        queued_count,
        shortlist_target,
        metadata
      )
      VALUES (
        ${jobId}::uuid,
        ${recruiterUserId}::uuid,
        'QUEUED',
        ${applications.length},
        0,
        ${shortlistTarget},
        ${JSON.stringify({ vacancyCount })}::jsonb
      )
      RETURNING id
    `;

    const batchId = batchRows[0]?.id;

    if (!batchId) {
      throw new BadRequestException('Unable to create ATS batch.');
    }

    let queuedCount = 0;

    for (const app of applications) {
      await this.prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          atsStatus: 'QUEUED',
          atsError: null,
          atsQueuedAt: new Date(),
        } as any,
      });

      const queueJob = await this.atsQueue.add(
        ATS_JOB.CHECK_APPLICATION,
        {
          applicationId: app.id,
          jobId,
          recruiterUserId,
          batchId,
          source: 'bulk',
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 60 * 60 * 24, count: 10000 },
          removeOnFail: { age: 60 * 60 * 24 * 7, count: 10000 },
        },
      );

      await this.prisma.jobApplication.update({
        where: { id: app.id },
        data: { atsQueueJobId: String(queueJob.id) } as any,
      });

      queuedCount += 1;
    }

    await this.prisma.$executeRaw`
      UPDATE ats_bulk_batches
      SET queued_count = ${queuedCount}, started_at = now()
      WHERE id = ${batchId}::uuid
    `;

    return {
      batchId,
      jobId,
      total: applications.length,
      queued: queuedCount,
      shortlistTarget,
      status: 'QUEUED',
    };
  }

  async getBatchStatus(batchId: string, recruiterUserId: string) {
    const rows = await this.prisma.$queryRaw<Array<any>>`
      SELECT *
      FROM ats_bulk_batches
      WHERE id = ${batchId}::uuid
        AND recruiter_user_id = ${recruiterUserId}::uuid
      LIMIT 1
    `;

    if (!rows.length) {
      throw new NotFoundException('ATS batch not found.');
    }

    const batch = rows[0];

    return {
      id: batch.id,
      jobId: batch.job_id,
      status: batch.status,
      total: batch.total_count,
      queued: batch.queued_count,
      processed: batch.processed_count,
      failed: batch.failed_count,
      shortlistTarget: batch.shortlist_target,
      progress:
        batch.total_count > 0
          ? Math.round(
              ((batch.processed_count + batch.failed_count) /
                batch.total_count) *
                100,
            )
          : 0,
      error: batch.error,
      createdAt: batch.created_at,
      startedAt: batch.started_at,
      completedAt: batch.completed_at,
    };
  }

  async processApplicationFromQueue(payload: AtsQueuePayload) {
    const context = await this.getApplicationContext(payload.applicationId);
    this.assertRecruiterAccess(context, payload.recruiterUserId);

    await this.prisma.jobApplication.update({
      where: { id: payload.applicationId },
      data: {
        atsStatus: 'PROCESSING',
        atsError: null,
      } as any,
    });

    try {
      const result = await this.checkWithPythonOrFallback(context);

      await this.prisma.jobApplication.update({
        where: { id: payload.applicationId },
        data: {
          atsStatus: 'COMPLETED',
          atsScore: result.score,
          atsRecommendation: result.recommendation,
          atsMatchedSkills: result.matchedSkills,
          atsMissingSkills: result.missingSkills,
          atsReason: result.reason,
          atsBreakdown: result.breakdown as Prisma.InputJsonValue,
          atsError: null,
          atsCheckedAt: new Date(),
          matchScore: result.score,
        } as any,
      });

      await this.createStatusEvent(
        payload.applicationId,
        payload.recruiterUserId,
        'UNDER_REVIEW',
        `ATS checked. Score ${result.score}%. Recommendation: ${result.recommendation}.`,
        {
          atsScore: result.score,
          atsRecommendation: result.recommendation,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          source: payload.source,
          batchId: payload.batchId ?? null,
        },
      );

      if (payload.batchId) {
        await this.markBatchProcessed(payload.batchId, false);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ATS check failed';

      await this.prisma.jobApplication.update({
        where: { id: payload.applicationId },
        data: {
          atsStatus: 'FAILED',
          atsError: message.slice(0, 1000),
        } as any,
      });

      if (payload.batchId) {
        await this.markBatchProcessed(payload.batchId, true);
      }

      throw error;
    }
  }

  async autoShortlist(jobId: string, recruiterUserId: string, vacancyCount = 1) {
    await this.assertRecruiterOwnsJob(jobId, recruiterUserId);

    const applications = await this.prisma.jobApplication.findMany({
      where: {
        jobId,
        atsStatus: 'COMPLETED',
        status: {
          notIn: ['REJECTED', 'HIRED', 'WITHDRAWN'],
        } as any,
      },
      orderBy: [{ atsScore: 'desc' }, { appliedAt: 'asc' }],
    });

    if (!applications.length) {
      throw new BadRequestException('No ATS completed applications found.');
    }

    const target = this.getShortlistTarget(vacancyCount, applications.length);

    const selected = applications
      .filter((app) => (app.atsScore ?? 0) >= 55)
      .slice(0, target);

    const backup = applications
      .filter((app) => !selected.some((s) => s.id === app.id))
      .slice(0, Math.max(0, target));

    for (const app of selected) {
      const oldStatus = app.status;

      await this.prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          status: 'SHORTLISTED',
          lastStatusChangedAt: new Date(),
        } as any,
      });

      await this.createStatusEvent(
        app.id,
        recruiterUserId,
        'SHORTLISTED',
        `Auto-shortlisted from ATS rank. Score ${app.atsScore ?? 0}%.`,
        {
          oldStatus,
          atsScore: app.atsScore,
          atsRecommendation: app.atsRecommendation,
          vacancyCount,
          shortlistTarget: target,
          source: 'AUTO_SHORTLIST',
        },
      );
    }

    for (const app of backup) {
      if (app.status !== 'ON_HOLD') {
        await this.prisma.jobApplication.update({
          where: { id: app.id },
          data: {
            status: 'ON_HOLD',
            lastStatusChangedAt: new Date(),
          } as any,
        });

        await this.createStatusEvent(
          app.id,
          recruiterUserId,
          'ON_HOLD',
          `Moved to backup pool after auto-shortlist. Score ${app.atsScore ?? 0}%.`,
          {
            atsScore: app.atsScore,
            source: 'BACKUP_POOL',
          },
        );
      }
    }

    return {
      jobId,
      vacancyCount,
      shortlistTarget: target,
      shortlisted: selected.length,
      backup: backup.length,
      selectedApplicationIds: selected.map((app) => app.id),
      backupApplicationIds: backup.map((app) => app.id),
    };
  }

  private async getApplicationContext(applicationId: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        candidate: {
          include: {
            profile: true,
            jobseekerProfile: true,
          },
        },
        resume: {
          include: {
            resumeAnalysis: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    if (!application.resume) {
      throw new BadRequestException('Application has no resume linked.');
    }

    return application;
  }

  private assertRecruiterAccess(
    context: ApplicationContext,
    recruiterUserId: string,
  ) {
    if (context.job.recruiterUserId !== recruiterUserId) {
      throw new ForbiddenException('You cannot run ATS for this job.');
    }
  }

  private async assertRecruiterOwnsJob(jobId: string, recruiterUserId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        recruiterUserId,
      },
      select: { id: true },
    });

    if (!job) {
      throw new ForbiddenException('Job not found for this recruiter.');
    }
  }

  private async checkWithPythonOrFallback(
    context: ApplicationContext,
  ): Promise<AtsCheckResult> {
    const payload = this.buildAtsPayload(context);

    return this.checkPythonPayloadOrFallback(payload);
  }

  private async checkPythonPayloadOrFallback(
    payload: AtsPayload,
  ): Promise<AtsCheckResult> {
    const pythonUrl = process.env.PYTHON_API_URL;
    const pythonEnabled =
      process.env.ENABLE_PYTHON_ATS === 'true' || Boolean(pythonUrl);

    this.logger.log(
      `[ATS] Checking application=${payload.applicationId} job="${payload.job.title}" requiredSkills=${payload.job.requiredSkills.length} resumeText=${payload.resume.text.length} resumeSkills=${payload.resume.skills.length}`,
    );

    if (pythonEnabled && pythonUrl) {
      try {
        const { data } = await axios.post(
          `${pythonUrl.replace(/\/$/, '')}/ats/check`,
          payload,
          {
            timeout: 60_000,
            headers: process.env.PYTHON_API_KEY
              ? { 'x-api-key': process.env.PYTHON_API_KEY }
              : undefined,
          },
        );

        const normalized = this.normalizePythonResult(data);

        this.logger.log(
          `[ATS:Python] application=${payload.applicationId} score=${normalized.score} recommendation=${normalized.recommendation} matched=${normalized.matchedSkills.length} missing=${normalized.missingSkills.length}`,
        );

        if (
          normalized.score > 0 &&
          (normalized.matchedSkills.length > 0 ||
            normalized.missingSkills.length > 0)
        ) {
          return normalized;
        }

        this.logger.warn(
          `[ATS:Python] Empty result for application=${payload.applicationId}. Falling back to Nest scorer.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Python ATS failed';

        this.logger.warn(
          `[ATS:Python] Failed for application=${payload.applicationId}: ${message}. Falling back to Nest scorer.`,
        );
      }
    }

    const fallback = this.fallbackScore(payload);

    this.logger.log(
      `[ATS:Fallback] application=${payload.applicationId} score=${fallback.score} recommendation=${fallback.recommendation} matched=${fallback.matchedSkills.length} missing=${fallback.missingSkills.length}`,
    );

    return fallback;
  }

  private buildAtsPayload(context: ApplicationContext): AtsPayload {
    const resumeAnalysis = context.resume?.resumeAnalysis ?? null;
    const analysisJson = context.resume?.analysisJson ?? {};

    const rawTextParts = [
      context.resume?.extractedText,
      resumeAnalysis?.rawText,
      (resumeAnalysis as any )?.rawTextPreview,
      this.buildSearchText(analysisJson),
      this.buildSearchText(resumeAnalysis),
      this.buildSearchText(context.candidate.jobseekerProfile),
      this.buildSearchText(context.candidate.profile),
    ];

    const resumeText = rawTextParts
      .filter(Boolean)
      .map((part) => String(part))
      .join('\n')
      .trim();

    const resumeSkills = this.uniqueStrings([
      ...this.extractSkillsDeep(resumeAnalysis),
      ...this.extractSkillsDeep(analysisJson),
      ...this.toStringArray(context.candidate.jobseekerProfile?.topSkills),
      ...this.extractSkillsFromText(resumeText),
    ]);

    return {
      applicationId: context.id,
      candidate: {
        id: context.candidate.id,
        name: context.candidate.fullName ?? context.candidate.email,
        email: context.candidate.email,
        profileSkills: this.uniqueStrings([
          ...this.toStringArray(context.candidate.jobseekerProfile?.topSkills),
          ...this.extractSkillsDeep(context.candidate.jobseekerProfile),
        ]),
        experienceYears:
          context.candidate.jobseekerProfile?.experienceYears ??
          resumeAnalysis?.experienceYears ??
          this.extractExperienceYears(analysisJson) ??
          0,
      },
      job: {
        id: context.job.id,
        title: context.job.title,
        description: context.job.description ?? '',
        requiredSkills: this.toStringArray(context.job.requiredSkills),
        experienceMin: context.job.experienceMin ?? 0,
        experienceMax: context.job.experienceMax ?? null,
        industry: context.job.industry,
        companyName: context.job.companyName,
      },
      resume: {
        id: context.resume?.id ?? null,
        fileName: context.resume?.originalFileName ?? '',
        text: resumeText,
        rawText: resumeText,
        extractedText: resumeText,
        skills: resumeSkills,
        projects: this.toArray(
          resumeAnalysis?.projects ?? (analysisJson as any)?.projects,
        ),
        experience: this.toArray(
          resumeAnalysis?.workExperience ??
            (analysisJson as any)?.workExperience ??
            (analysisJson as any)?.experience,
        ),
        education: this.toArray(
          resumeAnalysis?.education ?? (analysisJson as any)?.education,
        ),
        certifications: this.toArray(
          resumeAnalysis?.certifications ??
            (analysisJson as any)?.certifications,
        ),
        analysisJson,
      },
      resumeAnalysis: {
        ...(typeof analysisJson === 'object' && analysisJson
          ? (analysisJson as Record<string, any>)
          : {}),
        ...(resumeAnalysis ? (resumeAnalysis as Record<string, any>) : {}),
      },
      scoringPolicy: this.defaultScoringPolicy(),
    };
  }

  private defaultScoringPolicy() {
    return {
      requiredSkillMatch: 38,
      semanticMatch: 18,
      projectRelevance: 15,
      experienceRelevance: 10,
      roleTitleRelevance: 9,
      sectionCompleteness: 6,
      keywordPlacement: 2.5,
      formattingReadability: 1.5,
    };
  }

  private normalizePythonResult(data: any): AtsCheckResult {
    const score = this.clampScore(
      data?.score ??
        data?.atsScore ??
        data?.ats_score ??
        data?.result?.score ??
        0,
    );

    const recommendation = this.recommendationFromScore(
      score,
      data?.atsRecommendation ?? data?.recommendation,
    );

    return {
      score,
      recommendation,
      matchedSkills: this.uniqueStrings(
        this.toStringArray(
          data?.matchedSkills ?? data?.matched_skills ?? data?.matched,
        ),
      ),
      missingSkills: this.uniqueStrings(
        this.toStringArray(
          data?.missingSkills ?? data?.missing_skills ?? data?.missing,
        ),
      ),
      reason:
        String(data?.reason ?? data?.summary ?? data?.explanation ?? '')
          .slice(0, 1500) ||
        `ATS score ${score}% based on job-specific JD and resume match.`,
      breakdown: {
        requiredSkillMatch: this.clampScore(
          data?.breakdown?.requiredSkillMatch ?? 0,
        ),
        semanticMatch: this.clampScore(data?.breakdown?.semanticMatch ?? 0),
        projectRelevance: this.clampScore(
          data?.breakdown?.projectRelevance ?? 0,
        ),
        experienceRelevance: this.clampScore(
          data?.breakdown?.experienceRelevance ?? 0,
        ),
        roleTitleRelevance: this.clampScore(
          data?.breakdown?.roleTitleRelevance ?? 0,
        ),
        sectionCompleteness: this.clampScore(
          data?.breakdown?.sectionCompleteness ?? 0,
        ),
        keywordPlacement: this.clampScore(
          data?.breakdown?.keywordPlacement ?? 0,
        ),
        formattingReadability: this.clampScore(
          data?.breakdown?.formattingReadability ?? 0,
        ),
        jdRoleFamily: data?.breakdown?.jdRoleFamily ?? data?.roleFamily,
        requiredSkillsUsed: this.toStringArray(
          data?.breakdown?.requiredSkillsUsed,
        ),
        resumeSkillsDetected: this.toStringArray(
          data?.breakdown?.resumeSkillsDetected,
        ),
        resumeTextLength: data?.breakdown?.resumeTextLength ?? 0,
        evidence: this.toStringArray(data?.breakdown?.evidence ?? data?.evidence),
        warnings: this.toStringArray(
          data?.breakdown?.warnings ?? data?.warnings,
        ),
      },
    };
  }

  private fallbackScore(payload: AtsPayload): AtsCheckResult {
    const jdText = this.normalizeText(
      `${payload.job.title} ${payload.job.description} ${payload.job.requiredSkills.join(' ')}`,
    );

    const resumeCorpus = this.normalizeText(
      [
        payload.resume.text,
        payload.resume.skills.join(' '),
        payload.candidate.profileSkills.join(' '),
        payload.resume.projects.map((p) => this.buildSearchText(p)).join(' '),
        payload.resume.experience.map((e) => this.buildSearchText(e)).join(' '),
        payload.resume.education.map((e) => this.buildSearchText(e)).join(' '),
        this.buildSearchText(payload.resume.analysisJson),
        this.buildSearchText(payload.resumeAnalysis),
      ].join('\n'),
    );

    const requiredSkills = this.uniqueStrings([
      ...this.normalizeSkills(payload.job.requiredSkills),
      ...this.extractSkillsFromText(payload.job.description),
      ...this.extractSkillsFromText(payload.job.title),
    ]);

    const resumeSkills = this.uniqueStrings([
      ...this.normalizeSkills(payload.resume.skills),
      ...this.normalizeSkills(payload.candidate.profileSkills),
      ...this.extractSkillsFromText(resumeCorpus),
    ]);

    const matchedSkills = requiredSkills.filter((skill) =>
      this.skillExists(skill, resumeCorpus, resumeSkills),
    );

    const missingSkills = requiredSkills.filter(
      (skill) => !matchedSkills.includes(skill),
    );

    const requiredSkillPct = requiredSkills.length
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : 0;

    const roleFamily = this.detectRoleFamily(jdText);
    const roleKeywords = this.roleKeywords(roleFamily);

    const roleHits = roleKeywords.filter((keyword) =>
      this.skillExists(keyword, resumeCorpus, resumeSkills),
    ).length;

    const rolePct = roleKeywords.length
      ? Math.round((roleHits / roleKeywords.length) * 100)
      : 40;

    const projectText = this.normalizeText(
      payload.resume.projects.map((p) => this.buildSearchText(p)).join(' '),
    );

    const projectHits = matchedSkills.filter((skill) =>
      this.keywordExists(projectText, skill),
    ).length;

    const projectPct = matchedSkills.length
      ? Math.round((projectHits / matchedSkills.length) * 100)
      : resumeCorpus.length > 400
        ? 25
        : 0;

    const experienceYears = Number(payload.candidate.experienceYears ?? 0);
    const minExp = Number(payload.job.experienceMin ?? 0);

    const experiencePct =
      minExp <= 0
        ? experienceYears > 0
          ? 85
          : 65
        : experienceYears >= minExp
          ? 90
          : Math.max(
              25,
              Math.round((experienceYears / Math.max(minExp, 1)) * 75),
            );

    const sectionSignals = [
      resumeCorpus.includes('summary'),
      resumeCorpus.includes('skills') || resumeSkills.length > 0,
      resumeCorpus.includes('project') || payload.resume.projects.length > 0,
      resumeCorpus.includes('experience') || payload.resume.experience.length > 0,
      resumeCorpus.includes('education') || payload.resume.education.length > 0,
    ];

    const sectionPct = Math.round(
      (sectionSignals.filter(Boolean).length / sectionSignals.length) * 100,
    );

    const semanticPct = Math.round(requiredSkillPct * 0.68 + rolePct * 0.32);

    const keywordPlacementPct = this.calculateKeywordPlacement(
      matchedSkills,
      resumeCorpus,
    );

    const formattingPct =
      resumeCorpus.length > 1200
        ? 90
        : resumeCorpus.length > 600
          ? 75
          : resumeCorpus.length > 250
            ? 55
            : 25;

    let score = Math.round(
      requiredSkillPct * 0.38 +
        semanticPct * 0.18 +
        projectPct * 0.15 +
        experiencePct * 0.1 +
        rolePct * 0.09 +
        sectionPct * 0.06 +
        keywordPlacementPct * 0.025 +
        formattingPct * 0.015,
    );

    const warnings: string[] = [];
    const evidence: string[] = [];

    for (const skill of matchedSkills.slice(0, 12)) {
      evidence.push(`Matched JD skill in resume/profile: ${skill}`);
    }

    if (!resumeCorpus || resumeCorpus.length < 80) {
      score = Math.min(score, 25);
      warnings.push(
        'Resume text/analysis is weak or missing. Run resume extraction first.',
      );
    }

    if (requiredSkills.length > 0 && matchedSkills.length === 0) {
      score = Math.min(score, 30);
      warnings.push('No required JD skills were found in the resume.');
    }

    if (roleFamily === 'ai') {
      const aiCoreHits = [
        'python',
        'machine learning',
        'nlp',
        'rag',
        'llm',
        'vector database',
        'scikit-learn',
        'tensorflow',
        'pytorch',
        'numpy',
        'pandas',
      ].filter((skill) =>
        this.skillExists(skill, resumeCorpus, resumeSkills),
      ).length;

      if (aiCoreHits >= 7) {
        score = Math.max(score, 84);
      } else if (aiCoreHits >= 5) {
        score = Math.max(score, 74);
      } else if (aiCoreHits >= 3) {
        score = Math.max(score, 58);
      } else if (aiCoreHits <= 1) {
        score = Math.min(score, 45);
        warnings.push('AI role detected but AI/ML evidence is weak.');
      }
    }

    if (roleFamily === 'fullstack') {
      const fsHits = [
        'react',
        'next.js',
        'node.js',
        'typescript',
        'api',
        'database',
      ].filter((skill) =>
        this.skillExists(skill, resumeCorpus, resumeSkills),
      ).length;

      if (fsHits >= 4) {
        score = Math.max(score, 72);
      } else if (fsHits <= 1) {
        score = Math.min(score, 50);
        warnings.push(
          'Full-stack role detected but frontend/backend evidence is weak.',
        );
      }
    }

    score = this.clampScore(score);

    const recommendation = this.recommendationFromScore(score);

    return {
      score,
      recommendation,
      matchedSkills,
      missingSkills,
      reason: `${recommendation}: ${score}% match for "${payload.job.title}". Matched ${matchedSkills.length}/${requiredSkills.length} JD skills. Missing: ${missingSkills.slice(0, 8).join(', ') || 'none'}.`,
      breakdown: {
        requiredSkillMatch: requiredSkillPct,
        semanticMatch: semanticPct,
        projectRelevance: projectPct,
        experienceRelevance: experiencePct,
        roleTitleRelevance: rolePct,
        sectionCompleteness: sectionPct,
        keywordPlacement: keywordPlacementPct,
        formattingReadability: formattingPct,
        jdRoleFamily: roleFamily,
        requiredSkillsUsed: requiredSkills,
        resumeSkillsDetected: resumeSkills,
        resumeTextLength: resumeCorpus.length,
        evidence,
        warnings,
      },
    };
  }

  private detectRoleFamily(text: string) {
    if (
      /(ai|artificial intelligence|machine learning|ml|deep learning|nlp|llm|rag|data scientist|pytorch|tensorflow|scikit|vector database|embedding)/i.test(
        text,
      )
    ) {
      return 'ai';
    }

    if (/(full stack|fullstack|mern|react.*node|node.*react)/i.test(text)) {
      return 'fullstack';
    }

    if (/(frontend|front end|react|next\.js|ui developer)/i.test(text)) {
      return 'frontend';
    }

    if (/(backend|back end|api|nestjs|spring boot|django|fastapi)/i.test(text)) {
      return 'backend';
    }

    if (/(devops|cloud|kubernetes|docker|ci\/cd|aws|azure)/i.test(text)) {
      return 'devops';
    }

    if (/(mobile|android|ios|flutter|react native)/i.test(text)) {
      return 'mobile';
    }

    if (/(data analyst|data engineer|etl|power bi|sql analyst)/i.test(text)) {
      return 'data';
    }

    return 'software';
  }

  private roleKeywords(role: string) {
    const map: Record<string, string[]> = {
      ai: [
        'python',
        'machine learning',
        'deep learning',
        'nlp',
        'llm',
        'rag',
        'vector database',
        'embeddings',
        'scikit-learn',
        'tensorflow',
        'pytorch',
        'numpy',
        'pandas',
        'prompt engineering',
      ],
      fullstack: [
        'react',
        'next.js',
        'node.js',
        'typescript',
        'api',
        'database',
        'frontend',
        'backend',
      ],
      frontend: [
        'react',
        'next.js',
        'javascript',
        'typescript',
        'css',
        'html',
        'responsive',
      ],
      backend: [
        'api',
        'database',
        'authentication',
        'node.js',
        'java',
        'server',
      ],
      devops: [
        'docker',
        'linux',
        'cloud',
        'ci/cd',
        'deployment',
        'monitoring',
      ],
      mobile: ['android', 'ios', 'flutter', 'react native', 'mobile'],
      data: [
        'python',
        'sql',
        'pandas',
        'numpy',
        'etl',
        'data analysis',
        'statistics',
        'power bi',
      ],
      software: ['software', 'project', 'api', 'database', 'testing'],
    };

    return map[role] ?? map.software;
  }

  private extractSkillsFromText(text: unknown): string[] {
    const corpus = this.normalizeText(String(text ?? ''));

    if (!corpus) return [];

    const knownSkills = [
      'python',
      'machine learning',
      'deep learning',
      'nlp',
      'natural language processing',
      'llm',
      'large language model',
      'rag',
      'retrieval augmented generation',
      'vector database',
      'vector search',
      'embeddings',
      'semantic search',
      'prompt engineering',
      'scikit-learn',
      'sklearn',
      'tensorflow',
      'pytorch',
      'numpy',
      'pandas',
      'spacy',
      'huggingface',
      'transformers',
      'opencv',
      'langchain',
      'langgraph',
      'fastapi',
      'flask',
      'django',
      'node.js',
      'node',
      'express.js',
      'express',
      'nestjs',
      'react',
      'next.js',
      'typescript',
      'javascript',
      'html',
      'css',
      'tailwind',
      'shadcn ui',
      'material ui',
      'framer motion',
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'gcp',
      'linux',
      'git',
      'github',
      'java',
      'spring boot',
      'data analysis',
      'statistics',
      'etl',
      'airflow',
      'power bi',
    ];

    return knownSkills.filter((skill) => this.keywordExists(corpus, skill));
  }

  private extractSkillsDeep(value: unknown): string[] {
    const out = new Set<string>();

    const visit = (node: unknown) => {
      if (!node) return;

      if (typeof node === 'string') {
        const direct = this.toStringArray(node);

        for (const item of direct) out.add(item);
        for (const item of this.extractSkillsFromText(node)) out.add(item);

        return;
      }

      if (Array.isArray(node)) {
        for (const item of node) visit(item);
        return;
      }

      if (typeof node === 'object') {
        const obj = node as Record<string, unknown>;

        const skillKeys = [
          'skills',
          'topSkills',
          'technicalSkills',
          'detectedSkills',
          'requiredSkills',
          'techStack',
          'technologies',
          'tools',
          'industryTags',
        ];

        for (const key of skillKeys) {
          if (obj[key]) {
            for (const item of this.toStringArray(obj[key])) {
              out.add(item);
            }
          }
        }

        for (const key of Object.keys(obj)) {
          if (
            [
              'rawText',
              'rawTextPreview',
              'summary',
              'headline',
              'description',
              'title',
              'text',
              'projects',
              'workExperience',
              'experience',
              'education',
              'certifications',
              'analysisJson',
            ].includes(key)
          ) {
            visit(obj[key]);
          }
        }
      }
    };

    visit(value);

    return this.normalizeSkills(Array.from(out));
  }

  private extractExperienceYears(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;

    const obj = value as Record<string, any>;

    const direct = Number(
      obj.experienceYears ??
        obj.experience_years ??
        obj.totalExperience ??
        obj.total_experience ??
        0,
    );

    if (Number.isFinite(direct) && direct > 0) return direct;

    const text = this.buildSearchText(value);
    const match = text.match(
      /(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years|year|yrs|yr)/i,
    );

    if (!match) return 0;

    const parsed = Number(match[1]);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private calculateKeywordPlacement(
    matchedSkills: string[],
    resumeCorpus: string,
  ) {
    if (!matchedSkills.length) return 0;

    const importantSections = ['summary', 'skills', 'projects', 'experience'];
    const hasSections = importantSections.filter((section) =>
      resumeCorpus.includes(section),
    ).length;

    const base = 65;
    const sectionBonus = hasSections * 8;

    return this.clampScore(base + sectionBonus);
  }

  private skillExists(
    skill: string,
    resumeCorpus: string,
    resumeSkills: string[],
  ): boolean {
    const normalizedSkill = this.normalizeSkill(skill);
    const synonyms = this.skillSynonyms(normalizedSkill);

    return synonyms.some((synonym) => {
      const normalizedSynonym = this.normalizeSkill(synonym);

      return (
        resumeSkills.includes(normalizedSynonym) ||
        this.keywordExists(resumeCorpus, normalizedSynonym)
      );
    });
  }

  private keywordExists(corpus: string, keyword: string): boolean {
    const normalizedCorpus = this.normalizeText(corpus);
    const normalizedKeyword = this.normalizeSkill(keyword);

    if (!normalizedCorpus || !normalizedKeyword) return false;

    if (normalizedCorpus.includes(normalizedKeyword)) return true;

    const compactCorpus = normalizedCorpus.replace(/[^a-z0-9+#]/g, '');
    const compactKeyword = normalizedKeyword.replace(/[^a-z0-9+#]/g, '');

    if (compactKeyword.length >= 3 && compactCorpus.includes(compactKeyword)) {
      return true;
    }

    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`,
      'i',
    );

    return regex.test(normalizedCorpus);
  }

  private skillSynonyms(skill: string): string[] {
    const map: Record<string, string[]> = {
      'scikit-learn': ['scikit-learn', 'sklearn', 'scikit learn'],
      sklearn: ['scikit-learn', 'sklearn', 'scikit learn'],
      'next.js': ['next.js', 'nextjs', 'next js'],
      nextjs: ['next.js', 'nextjs', 'next js'],
      'node.js': ['node.js', 'nodejs', 'node js', 'node'],
      node: ['node.js', 'nodejs', 'node js', 'node'],
      'express.js': ['express.js', 'expressjs', 'express js', 'express'],
      'material ui': ['material ui', 'mui', 'material-ui'],
      'shadcn ui': ['shadcn ui', 'shadcn', 'shadcn/ui'],
      'framer motion': ['framer motion', 'framer-motion'],
      'vector database': [
        'vector database',
        'vector db',
        'vector search',
        'pinecone',
        'faiss',
        'chroma',
      ],
      rag: ['rag', 'retrieval augmented generation', 'retrieval-augmented generation'],
      llm: ['llm', 'large language model', 'large language models'],
      nlp: ['nlp', 'natural language processing'],
      embeddings: ['embeddings', 'embedding', 'semantic search'],
      'prompt engineering': ['prompt engineering', 'prompting', 'prompts'],
      javascript: ['javascript', 'js'],
      typescript: ['typescript', 'ts'],
      postgresql: ['postgresql', 'postgres'],
      mongodb: ['mongodb', 'mongo db', 'mongo'],
      'tailwind css': ['tailwind css', 'tailwind'],
    };

    return map[skill] ?? [skill];
  }

  private recommendationFromScore(
    score: number,
    direct?: string | null,
  ): AtsRecommendation {
    const normalized = String(direct ?? '').toUpperCase();

    if (
      normalized === 'STRONG_SHORTLIST' ||
      normalized === 'SHORTLIST' ||
      normalized === 'REVIEW' ||
      normalized === 'WEAK_MATCH' ||
      normalized === 'REJECT'
    ) {
      return normalized as AtsRecommendation;
    }

    if (score >= 85) return 'STRONG_SHORTLIST' as AtsRecommendation;
    if (score >= 70) return 'SHORTLIST' as AtsRecommendation;
    if (score >= 55) return 'REVIEW' as AtsRecommendation;
    if (score >= 40) return 'WEAK_MATCH' as AtsRecommendation;

    return 'REJECT' as AtsRecommendation;
  }

  private toLegacyRecommendation(
    recommendation: AtsRecommendation,
  ): 'SHORTLIST' | 'REVIEW' | 'REJECT' {
    if (recommendation === 'STRONG_SHORTLIST') return 'SHORTLIST';
    if (recommendation === 'SHORTLIST') return 'SHORTLIST';
    if (recommendation === 'REVIEW') return 'REVIEW';
    if (recommendation === 'WEAK_MATCH') return 'REVIEW';

    return 'REJECT';
  }

  private getShortlistTarget(vacancyCount: number, total: number) {
    const vacancies = Math.max(1, Math.round(Number(vacancyCount) || 1));
    const multiplier = vacancies <= 5 ? 5 : vacancies <= 25 ? 4 : 3;

    return Math.min(total, vacancies * multiplier);
  }

  private async createStatusEvent(
    applicationId: string,
    changedByUserId: string,
    toStatus: any,
    reason: string,
    metadata: Record<string, any>,
  ) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { status: true },
    });

    await this.prisma.candidateStatusEvent.create({
      data: {
        applicationId,
        fromStatus: app?.status ?? null,
        toStatus,
        changedByUserId,
        reason,
        metadata,
      } as any,
    });
  }

  private async markBatchProcessed(batchId: string, failed: boolean) {
    await this.prisma.$executeRaw`
      UPDATE ats_bulk_batches
      SET
        processed_count = processed_count + ${failed ? 0 : 1},
        failed_count = failed_count + ${failed ? 1 : 0},
        status = CASE
          WHEN processed_count + failed_count + 1 >= total_count THEN 'COMPLETED'
          ELSE 'PROCESSING'
        END,
        completed_at = CASE
          WHEN processed_count + failed_count + 1 >= total_count THEN now()
          ELSE completed_at
        END
      WHERE id = ${batchId}::uuid
    `;
  }

  private buildResumePublicUrl(bucket?: string | null, path?: string | null) {
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl || !bucket || !path) return null;

    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`;
  }

  private normalizeSkills(input: unknown) {
    return this.uniqueStrings(
      this.toStringArray(input)
        .map((skill) => this.normalizeSkill(skill))
        .filter(Boolean),
    );
  }

  private normalizeSkill(skill: unknown) {
    return String(skill ?? '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\bnodejs\b/g, 'node.js')
      .replace(/\bnextjs\b/g, 'next.js')
      .replace(/\bsklearn\b/g, 'scikit-learn')
      .trim();
  }

  private normalizeText(text: unknown) {
    return String(text ?? '')
      .toLowerCase()
      .replace(/[_/|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildSearchText(value: unknown): string {
    if (!value) return '';

    if (typeof value === 'string') return value;

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.buildSearchText(item)).join(' ');
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      return Object.values(obj)
        .map((item) => this.buildSearchText(item))
        .join(' ');
    }

    return '';
  }

  private toArray(value: unknown): any[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    return [value];
  }

  private toStringArray(value: unknown): string[] {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .flatMap((item) => this.toStringArray(item))
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (!trimmed) return [];

      if (trimmed.includes(',')) {
        return trimmed
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return [trimmed];
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      const direct =
        obj.name ??
        obj.skill ??
        obj.title ??
        obj.label ??
        obj.value ??
        null;

      if (direct) return [String(direct)];

      return [];
    }

    return [String(value)];
  }

  private uniqueStrings(items: string[]) {
    return Array.from(
      new Set(items.map((item) => this.normalizeSkill(item)).filter(Boolean)),
    );
  }

  private clampScore(value: unknown) {
    const num = Number(value);

    if (!Number.isFinite(num)) return 0;

    return Math.max(0, Math.min(100, Math.round(num)));
  }
}