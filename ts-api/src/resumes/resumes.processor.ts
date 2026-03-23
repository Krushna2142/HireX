/* eslint-disable prettier/prettier */
// FILE: src/resumes/resumes.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }                 from '@nestjs/common';
import { Job }                    from 'bullmq';
import { ResumeAnalysisService }  from './resumes-analysis.service';
import { PrismaService }          from '../../prisma/prisma.service';

export interface ResumeAnalysisJob {
  resumeId: string;
  buffer:   number[];
  mimetype: string;
}

@Processor('resume-analysis')
export class ResumesProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumesProcessor.name);

  constructor(
    private readonly analysisService: ResumeAnalysisService,
    private readonly prisma:          PrismaService,
  ) {
    super();
  }

  async process(job: Job<ResumeAnalysisJob>): Promise<void> {
    const { resumeId, buffer, mimetype } = job.data;

    this.logger.log(`[processor] Job ${job.id} started — resumeId: ${resumeId}`);

    const buf = Buffer.from(buffer);

    // ── Step 1: Run LLM analysis ───────────────────────────────────────────
    // analyzeResume saves the ResumeAnalysis record, updates resume status to
    // 'analyzed', and returns the extracted result directly.
    // It throws on failure — BullMQ retries per the job's backoff config.
    let extracted: Awaited<ReturnType<typeof this.analysisService.analyzeResume>>;

    try {
      extracted = await this.analysisService.analyzeResume(resumeId, buf, mimetype);
    } catch (err) {
      // analyzeResume already logged the error and set status='failed'.
      // Re-throw so BullMQ records the failure and schedules a retry.
      throw err;
    }

    this.logger.log(`[processor] LLM extraction complete for resume ${resumeId}`);

    // ── Step 2: Resolve userId ─────────────────────────────────────────────
    const resume = await this.prisma.resume.findUnique({
      where:  { id: resumeId },
      select: { userId: true },
    });

    if (!resume?.userId) {
      this.logger.warn(`[processor] No userId for resume ${resumeId} — skipping profile sync`);
      return;
    }

    // ── Step 3: Sync candidate_profiles ───────────────────────────────────
    // This is the ONLY place profile sync happens.
    // getRecommendations() reads candidate_profiles.top_skills — this row
    // must exist before the frontend polls for recommendations.
    //
    // Fields synced from AI output:
    //   topSkills, targetIndustries, experienceLevel, experienceYears
    //
    // Fields intentionally NOT touched (user-controlled):
    //   targetRoles, salaryMin, workMode, bio, headline

    const topSkills        = extracted.topSkills      ?? [];
    const targetIndustries = extracted.industryTags   ?? [];
    const experienceLevel  = extracted.experienceLevel ?? 'junior';
    const experienceYears  = extracted.experienceYears ?? 0;

    const currentRole =
      extracted.workExperience?.find(w => w.isCurrent) ??
      extracted.workExperience?.[0];

    const headline = currentRole
      ? `${currentRole.title} at ${currentRole.company}`
      : null;

    const profileCompletion = this.analysisService.calculateCompletion(extracted);

    try {
      await this.prisma.candidateProfile.upsert({
        where: { userId: resume.userId },

        create: {
          userId:            resume.userId,
          headline,
          bio:               extracted.summary       ?? null,
          currentTitle:      currentRole?.title       ?? null,
          currentCompany:    currentRole?.company     ?? null,
          topSkills,
          targetIndustries,
          experienceLevel,
          experienceYears,
          activeResumeId:    resumeId,
          profileCompletion,
        },

        update: {
          headline,
          currentTitle:      currentRole?.title       ?? null,
          currentCompany:    currentRole?.company     ?? null,
          topSkills,
          targetIndustries,
          experienceLevel,
          experienceYears,
          activeResumeId:    resumeId,
          profileCompletion,
          updatedAt:         new Date(),
        },
      });

      this.logger.log(
        `[processor] ✅ candidate_profiles synced for user ${resume.userId} — ` +
        `level: ${experienceLevel} | ` +
        `skills: [${topSkills.slice(0, 5).join(', ')}${topSkills.length > 5 ? '…' : ''}]`,
      );

    } catch (profileErr) {
      // Profile sync failure should NOT fail the job — analysis is already saved.
      // Log the error with full detail so you can fix schema issues without
      // forcing users to re-upload.
      const err = profileErr as Error;
      this.logger.error(
        `[processor] ⚠️ Profile sync failed for user ${resume.userId}\n` +
        `  This means recommendations won't work until the profile is re-synced.\n` +
        `  Error: ${err.message}\n` +
        `  Stack: ${err.stack?.split('\n')[1]?.trim() ?? 'N/A'}`,
      );
      // Don't re-throw — the resume is analyzed, don't mark it as failed
    }
  }
}