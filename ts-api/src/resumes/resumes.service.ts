/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('resume-analysis') private readonly analysisQueue: Queue,
  ) {}

  // ── Upload & enqueue ──────────────────────────────────────────────────────

  async saveRawResume(file: Express.Multer.File, userId: string) {
    this.logger.log(`Upload initiated — userId: ${userId}`);
    this.logger.log(`File: ${file?.originalname} | ${file?.mimetype} | ${file?.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌ MISSING'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ MISSING'}`);
    this.logger.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅' : '❌ MISSING'}`);

    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${userId}/${Date.now()}-${sanitized}`;

    // ── Stage 1: Upload to Supabase Storage ──────────────────────────────
    const supabase = getSupabaseServiceClient();

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('resume-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    this.logger.log(`Supabase result: ${JSON.stringify({ uploadData, uploadError })}`);

    if (uploadError) {
      this.logger.error(`Storage failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;
    this.logger.log(`File URL: ${rawFile}`);

    // ── Stage 2: Persist metadata ─────────────────────────────────────────
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

      // ── Stage 3: Enqueue analysis ─────────────────────────────────────
      await this.analysisQueue.add(
        'analyze',
        {
          resumeId: resume.id,
          buffer:   Array.from(file.buffer),
          mimetype: file.mimetype,
        },
        {
          attempts:         3,
          backoff:          { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail:     50,
        },
      );

      this.logger.log(`Analysis queued for resume: ${resume.id}`);
      return { ...resume, analysisStatus: 'queued' };

    } catch (dbError) {
      this.logger.error(`Prisma insert failed: ${dbError.message}`);
      // Rollback storage if DB write fails
      await supabase.storage.from('resume-files').remove([fileName]);
      this.logger.log(`Storage rollback completed for: ${fileName}`);
      throw new InternalServerErrorException(`Database insert failed: ${dbError.message}`);
    }
  }

  // ── GET /resumes/:id — status polling endpoint ────────────────────────────
  // This is called every 5s by the frontend until status = 'analyzed' | 'failed'

  async getById(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    // Ownership check — users can only access their own resumes
    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return resume;
  }

  // ── GET /resumes/:id/analysis — fetch full analysis result ────────────────
  // Returns 404 while analysis is still processing (frontend handles this)

  async getAnalysis(id: string, userId: string) {
    // First verify resume ownership
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Then fetch the analysis
    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId: id },
    });

    // Intentional 404 — frontend polls until this returns 200
    if (!analysis) {
      throw new NotFoundException('Analysis not ready yet');
    }

    return analysis;
  }

  // ── GET /resumes — list user's resumes ────────────────────────────────────

  async listByUser(userId: string) {
    return this.prisma.resume.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    });
  }
}