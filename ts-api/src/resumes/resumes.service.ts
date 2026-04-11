/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/resumes/resumes.service.ts

import {Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectQueue }   from '@nestjs/bullmq';
import { Queue }         from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';
import { ResumeAnalysisService } from './resumes-analysis.service';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analysisService: ResumeAnalysisService,
    @Optional()
    @InjectQueue('resume-analysis')
    private readonly analysisQueue?: Queue,
  ) {}

  // ── POST /resumes/upload-raw ───────────────────────────────────────────────
  // Stage 1 — Upload only. No analysis triggered.
  // Saves file to Supabase Storage, creates DB record with status='uploaded'.
  // Analysis is decoupled and triggered explicitly via POST /resumes/:id/analyse.

  async saveRawResume(file: Express.Multer.File, userId: string) {
    this.logger.log(`[upload] userId: ${userId} | ${file.originalname} | ${file.mimetype} | ${file.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌ MISSING'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ MISSING'}`);
    this.logger.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'OK' : 'MISSING'}`);

    // Sanitise filename — strip spaces and special chars for safe Supabase path
    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${userId}/${Date.now()}-${sanitized}`;

    // ── Stage 1: Upload to Supabase Storage ──────────────────────────────────
    const supabase = getSupabaseServiceClient();

    const { error: uploadError } = await supabase
      .storage
      .from('resume-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert:      false,
      });

    if (uploadError) {
      this.logger.error(`[upload] Supabase storage failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;
    this.logger.log(`[upload] File stored at: ${rawFile}`);

    // ── Stage 2: Persist resume record — status: 'uploaded' ──────────────────
    // Intentionally NOT enqueuing analysis here.
    // Analysis is decoupled — triggered by user via sidebar button.
    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          fileName,
          rawFile,
          status: 'uploaded',
        },
      });

      this.logger.log(`[upload] Resume record created: ${resume.id}`);

      return {
        ...resume,
        analysisStatus: 'not_started',
      };

    } catch (dbError: any) {
      this.logger.error(`[upload] DB insert failed: ${dbError.message}`);

      // Rollback Supabase upload to avoid orphaned files
      await supabase.storage.from('resume-files').remove([fileName]);
      this.logger.log(`[upload] Storage rollback complete for: ${fileName}`);

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }

  // ── POST /resumes/:id/analyse ─────────────────────────────────────────────
  // Stage 2 — Trigger analysis on demand.
  // Called when user clicks "Analyse Resume" in the sidebar.
  // Downloads file from Supabase, enqueues BullMQ job → Groq processes async.

  async triggerAnalysis(resumeId: string, userId: string) {
    this.logger.log(`[analyse] Trigger requested — resumeId: ${resumeId} | userId: ${userId}`);

    // ── Fetch and verify ownership ────────────────────────────────────────────
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${resumeId} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // ── Guard: already analysed ───────────────────────────────────────────────
    if (resume.status === 'analyzed') {
      this.logger.log(`[analyse] Resume ${resumeId} already analysed — skipping`);
      return {
        resumeId,
        status:  'analyzed',
        message: 'Resume has already been analysed',
      };
    }

    // ── Guard: already processing ─────────────────────────────────────────────
    if (resume.status === 'processing') {
      this.logger.log(`[analyse] Resume ${resumeId} already processing — skipping`);
      return {
        resumeId,
        status:  'processing',
        message: 'Analysis is already in progress',
      };
    }

    // ── Guard: fileName is string | null in Prisma schema ────────────────────
    // Supabase .download() requires a plain string.
    // A resume without a fileName is corrupted — reject with a clear message
    // rather than letting Supabase throw a cryptic downstream error.
    if (!resume.fileName) {
      this.logger.error(`[analyse] Resume ${resumeId} has no fileName — likely a corrupted record`);
      throw new BadRequestException(
        `Resume ${resumeId} has no associated file. Please re-upload your resume.`,
      );
    }

    // resume.fileName is now narrowed to string ✅

    // ── Download file from Supabase Storage ───────────────────────────────────
    // BullMQ workers run in a separate process — they need the raw buffer,
    // not just the storage URL.
    const supabase = getSupabaseServiceClient();

    this.logger.log(`[analyse] Downloading file from Supabase: ${resume.fileName}`);

    let fileData;
    try {
      const result = await supabase
        .storage
        .from('resume-files')
        .download(resume.fileName);

      if (result.error) {
        this.logger.error(`[analyse] Supabase download error: ${result.error.message}`);
        throw new InternalServerErrorException(
          `Supabase download failed: ${result.error.message}`,
        );
      }

      fileData = result.data;
      if (!fileData) {
        this.logger.error(`[analyse] Download returned empty data`);
        throw new InternalServerErrorException('Download returned empty file');
      }

      this.logger.log(`[analyse] File downloaded successfully — size: ${fileData.size} bytes`);
    } catch (downloadErr: any) {
      const errorMsg = downloadErr?.message ?? 'Unknown download error';
      this.logger.error(`[analyse] File download failed: ${errorMsg}`);
      
      // Mark as failed so UI shows error
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      throw new InternalServerErrorException(
        `Failed to download resume file: ${errorMsg}`,
      );
    }

    // Convert Blob → Buffer → number[] for BullMQ JSON serialisation
    let buffer: Buffer;
    try {
      this.logger.log(`[analyse] Converting Blob to Buffer`);
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      this.logger.log(`[analyse] Buffer conversion successful — size: ${buffer.length} bytes`);
    } catch (convErr: any) {
      const errorMsg = convErr?.message ?? 'Unknown conversion error';
      this.logger.error(`[analyse] Buffer conversion failed: ${errorMsg}`);

      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      throw new InternalServerErrorException(
        `Failed to convert file to buffer: ${errorMsg}`,
      );
    }

    // Infer mimetype from stored filename extension
    const mimetype = this.inferMimetype(resume.fileName);  // ✅ string — safe
    this.logger.log(`[analyse] Detected mimetype: ${mimetype}`);

    // ── If Redis/BullMQ is disabled, run analysis inline ─────────────────────
    if (!this.analysisQueue) {
      this.logger.warn('[analyse] BullMQ disabled (no Redis config) — running inline analysis');
      
      try {
        await this.analysisService.analyzeResume(resume.id, buffer, mimetype);
        this.logger.log(`[analyse] ✅ Inline analysis completed for ${resumeId}`);

        return {
          resumeId,
          status:  'analyzed',
          message: 'Analysis completed inline (queue disabled)',
        };
      } catch (inlineErr: any) {
        // analyzeResume already set status to 'failed', just log and re-throw
        const errorMsg = inlineErr?.message ?? 'Unknown analysis error';
        this.logger.error(
          `[analyse] ❌ Inline analysis failed for ${resumeId}: ${errorMsg}`,
        );
        throw new InternalServerErrorException(
          `Resume analysis failed: ${errorMsg}`,
        );
      }
    }

    // ── Enqueue analysis job ──────────────────────────────────────────────────
    try {
      this.logger.log(`[analyse] Enqueuing BullMQ job for resume: ${resumeId}`);
      
      await this.analysisQueue.add(
        'analyze',
        {
          resumeId: resume.id,
          buffer:   Array.from(buffer),   // Buffer → number[] for JSON serialisation
          mimetype,
        },
        {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail:     50,
        },
      );

      this.logger.log(`[analyse] ✅ Job successfully enqueued for resume: ${resumeId}`);
    } catch (queueErr: any) {
      const errorMsg = queueErr?.message ?? 'Unknown queue error';
      this.logger.error(`[analyse] ❌ Failed to enqueue job: ${errorMsg}`);

      // Mark as failed since we couldn't even queue the job
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      throw new InternalServerErrorException(
        `Failed to queue analysis job: ${errorMsg}`,
      );
    }

    // Mark as processing immediately so frontend poll reflects current state
    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  { status: 'processing' },
    });

    this.logger.log(`[analyse] ✅ Resume marked as processing: ${resumeId}`);

    return {
      resumeId,
      status:  'processing',
      message: 'Analysis started — poll GET /resumes/:id for status updates',
    };
  }

  // ── GET /resumes ──────────────────────────────────────────────────────────
  // Returns the authenticated user's resume history, most recent first.

  async listByUser(userId: string) {
    this.logger.log(`[list] Listing resumes for user: ${userId}`);

    return this.prisma.resume.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select: {
        id:        true,
        fileName:  true,
        rawFile:   true,
        status:    true,
        createdAt: true,
        // Exclude content (raw text) — too large for list views
      },
    });
  }

  // ── GET /resumes/latest ───────────────────────────────────────────────────
  // Returns the user's most recent resume.
  // Sidebar calls this on mount to determine the "Analyse Resume" button state.

  async getLatest(userId: string) {
    this.logger.log(`[latest] Fetching latest resume for user: ${userId}`);

    const resume = await this.prisma.resume.findFirst({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });

    return resume ?? null;
  }

  // ── GET /resumes/:id ──────────────────────────────────────────────────────
  // Status polling — called every 5s by frontend after analysis is triggered.
  // Returns the full resume record including current status.

  async getById(id: string, userId: string) {
    this.logger.log(`[getById] resumeId: ${id} | userId: ${userId}`);

    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    // Ownership guard — users can only access their own resumes
    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return resume;
  }

  // ── GET /resumes/:id/analysis ─────────────────────────────────────────────
  // Returns the completed analysis result.
  // Intentionally 404s while analysis is still running — frontend handles this.

  async getAnalysis(id: string, userId: string) {
    this.logger.log(`[getAnalysis] resumeId: ${id} | userId: ${userId}`);

    // Verify ownership before exposing analysis data
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId: id },
    });

    // 404 here is intentional and expected during processing.
    // Frontend polls GET /resumes/:id for status, and only calls
    // this endpoint once status === 'analyzed'.
    if (!analysis) {
      throw new NotFoundException('Analysis not ready yet');
    }

    return analysis;
  }

  // ── Private: infer MIME type from file extension ──────────────────────────

  private inferMimetype(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf'))  return 'application/pdf';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.doc'))  return 'application/msword';
    // Fallback — ResumeAnalysisService will throw an informative error
    return 'application/octet-stream';
  }
}