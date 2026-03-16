/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/resumes/resumes.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue }   from '@nestjs/bullmq';
import { Queue }         from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('resume-analysis') private readonly analysisQueue: Queue,
  ) {}

  // ── POST /resumes/upload-raw ───────────────────────────────────────────────
  // Uploads file to Supabase Storage, creates DB record, enqueues analysis job.
  // Returns immediately — analysis happens asynchronously via BullMQ.

  async saveRawResume(file: Express.Multer.File, userId: string) {
    this.logger.log(`Upload initiated — userId: ${userId}`);
    this.logger.log(`File: ${file?.originalname} | ${file?.mimetype} | ${file?.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌ MISSING'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ MISSING'}`);
    this.logger.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅' : '❌ MISSING'}`);
    this.logger.log(`GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅' : '❌ MISSING'}`);

    // Sanitise filename — strip spaces and special chars for safe storage path
    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${userId}/${Date.now()}-${sanitized}`;

    // ── Stage 1: Upload to Supabase Storage ──────────────────────────────────
    const supabase = getSupabaseServiceClient();

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('resume-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert:      false,
      });

    this.logger.log(`Supabase upload result: ${JSON.stringify({ uploadData, uploadError })}`);

    if (uploadError) {
      this.logger.error(`Storage upload failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;
    this.logger.log(`File stored at: ${rawFile}`);

    // ── Stage 2: Persist resume metadata to DB ───────────────────────────────
    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          fileName,
          rawFile,
          status: 'uploaded',
        },
      });

      this.logger.log(`Resume record created: ${resume.id}`);

      // ── Stage 3: Enqueue analysis job ─────────────────────────────────────
      // Buffer is serialised as a number array — BullMQ serialises job
      // data to JSON, which doesn't support raw Buffer objects.
      await this.analysisQueue.add(
        'analyze',
        {
          resumeId: resume.id,
          buffer:   Array.from(file.buffer),
          mimetype: file.mimetype,
        },
        {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail:     50,
        },
      );

      this.logger.log(`Analysis job enqueued for resume: ${resume.id}`);

      // Return immediately — analysis runs in background
      return { ...resume, analysisStatus: 'queued' };

    } catch (dbError: any) {
      this.logger.error(`DB insert failed: ${dbError.message}`);

      // Rollback Supabase upload to avoid orphaned files
      await supabase.storage.from('resume-files').remove([fileName]);
      this.logger.log(`Storage rollback complete for: ${fileName}`);

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }

  // ── GET /resumes ──────────────────────────────────────────────────────────
  // Returns the authenticated user's resume history, most recent first.

  async listByUser(userId: string) {
    this.logger.log(`Listing resumes for user: ${userId}`);

    return this.prisma.resume.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select: {
        id:        true,
        fileName:  true,
        rawFile:   true,
        status:    true,
        createdAt: true,
        // Exclude content (raw text) — too large for list view
      },
    });
  }

  // ── GET /resumes/:id ──────────────────────────────────────────────────────
  // Called by the frontend every 5 seconds to poll analysis status.
  // Returns the full resume record including current status.

  async getById(id: string, userId: string) {
    this.logger.log(`Fetching resume ${id} for user: ${userId}`);

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
  // Intentionally returns 404 while analysis is still in progress —
  // the frontend's pollResumeStatus() handles this gracefully.

  async getAnalysis(id: string, userId: string) {
    this.logger.log(`Fetching analysis for resume ${id}, user: ${userId}`);

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

    // Fetch analysis — will be null until the BullMQ job completes
    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId: id },
    });

    if (!analysis) {
      // 404 here is intentional and expected during processing.
      // Frontend polls GET /resumes/:id for status, and only calls
      // this endpoint once status === 'analyzed'.
      throw new NotFoundException('Analysis not ready yet');
    }

    return analysis;
  }
}