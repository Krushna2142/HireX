/* eslint-disable prettier/prettier */
// FILE: src/resumes/resumes.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger }                 from '@nestjs/common';
import { Job }                    from 'bullmq';
import { ResumeAnalysisService }  from './resumes-analysis.service';
import { PrismaService }          from '../../prisma/prisma.service';

export interface ResumeAnalysisJob {
  resumeId: string;
  buffer:   number[];   // Buffer serialised as number[] for BullMQ JSON transport
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

    this.logger.log(`[processor] Starting job ${job.id} for resume ${resumeId}`);

    const buf = Buffer.from(buffer);

    // ── Step 1: Run Groq analysis ──────────────────────────────────────────
    // analyzeResume saves the result to resume_analyses and marks
    // resumes.status = 'analyzed'. It throws on failure — BullMQ will
    // retry according to the job's backoff config.
    await this.analysisService.analyzeResume(resumeId, buf, mimetype);

    this.logger.log(`[processor] Groq analysis complete for resume ${resumeId}`);

    // ── Step 2: Read the saved analysis result ─────────────────────────────
    // We read it back from the DB rather than relying on the return value of
    // analyzeResume, because the shape of that service may change independently.
    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId },
    });

    if (!analysis) {
      // analyzeResume should always create this record — if it's missing,
      // log a warning but don't throw (the resume is still marked analyzed).
      this.logger.warn(
        `[processor] ResumeAnalysis record not found for ${resumeId} — skipping profile sync`,
      );
      return;
    }

    // ── Step 3: Resolve the userId from the resume ─────────────────────────
    const resume = await this.prisma.resume.findUnique({
      where:  { id: resumeId },
      select: { userId: true },
    });

    if (!resume?.userId) {
      this.logger.warn(`[processor] No userId for resume ${resumeId} — skipping profile sync`);
      return;
    }

    // ── Step 4: Sync extracted skills back to candidate_profiles ───────────
    // THIS IS THE CRITICAL STEP that was missing.
    //
    // getRecommendations() in both jobs.service.ts and recommendations.service.ts
    // reads candidate_profiles.top_skills to score jobs.  If this row is absent
    // or has an empty top_skills array, the recommendations endpoint returns 500.
    //
    // We upsert so:
    //   • First-time users who never filled in their profile get a row created.
    //   • Returning users who re-upload get their skills refreshed, not duplicated.

    // industryTags on ResumeAnalysis maps to targetIndustries on CandidateProfile
    const topSkills:        string[] = (analysis.topSkills       as string[]) ?? [];
    const targetIndustries: string[] = (analysis.industryTags    as string[]) ?? [];
    const experienceLevel:  string   = (analysis.experienceLevel as string)   ?? 'junior';
    const experienceYears:  number   = (analysis.experienceYears as number)   ?? 0;

    await this.prisma.candidateProfile.upsert({
      where: { userId: resume.userId },

      // Create: first-time user with no profile row yet
      create: {
        userId: resume.userId,
        topSkills,
        targetIndustries,
        experienceLevel,
        experienceYears,
      },

      // Update: refresh only AI-derived fields.
      // User-controlled preferences (targetRoles, salaryMin, workMode etc.)
      // are intentionally NOT touched.
      update: {
        topSkills,
        targetIndustries,
        experienceLevel,
        experienceYears,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `[processor] candidate_profiles synced for user ${resume.userId} — ` +
      `skills: [${topSkills.slice(0, 5).join(', ')}${topSkills.length > 5 ? '…' : ''}]`,
    );
  }
}