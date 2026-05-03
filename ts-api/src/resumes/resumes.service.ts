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
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ResumeAnalysisStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';
import { ResumeAnalysisService } from './resumes-analysis.service';

const RESUME_BUCKET = 'resume-files';

type ResumeListRow = {
  id: string;
  userId: string;
  storageBucket: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string | null;
  sizeBytes: bigint | null;
  analysisStatus: ResumeAnalysisStatus;
  analysisError?: string | null;
  analyzedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
};

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

  async saveRawResume(file: Express.Multer.File, userId: string) {
    this.logger.log(`[upload] userId: ${userId} | ${file.originalname} | ${file.mimetype} | ${file.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'missing'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'}`);
    this.logger.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'set' : 'missing'}`);

    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const storagePath = `${userId}/${Date.now()}-${sanitized}`;

    const supabase = getSupabaseServiceClient();

    const { error: uploadError } = await supabase
      .storage
      .from(RESUME_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(`[upload] Supabase storage failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    this.logger.log(`[upload] File stored at: ${RESUME_BUCKET}/${storagePath}`);

    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          storageBucket: RESUME_BUCKET,
          storagePath,
          originalFileName: file.originalname,
          mimeType: file.mimetype || null,
          sizeBytes: BigInt(file.size),
          analysisStatus: ResumeAnalysisStatus.PENDING,
        },
      });

      this.logger.log(`[upload] Resume record created: ${resume.id}`);
      return this.mapResumeForClient(resume);
    } catch (dbError: any) {
      this.logger.error(`[upload] DB insert failed: ${dbError.message}`);

      await supabase.storage.from(RESUME_BUCKET).remove([storagePath]);
      this.logger.log(`[upload] Storage rollback complete for: ${storagePath}`);

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }

  async triggerAnalysis(resumeId: string, userId: string) {
    this.logger.log(`[analyse] Trigger requested: resumeId=${resumeId} userId=${userId}`);

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${resumeId} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (resume.analysisStatus === ResumeAnalysisStatus.COMPLETED) {
      this.logger.log(`[analyse] Resume ${resumeId} already analysed, skipping`);
      return {
        resumeId,
        status: 'analyzed',
        message: 'Resume has already been analysed',
      };
    }

    if (resume.analysisStatus === ResumeAnalysisStatus.PROCESSING) {
      this.logger.log(`[analyse] Resume ${resumeId} already processing, skipping`);
      return {
        resumeId,
        status: 'processing',
        message: 'Analysis is already in progress',
      };
    }

    if (!resume.storagePath) {
      this.logger.error(`[analyse] Resume ${resumeId} has no storage path`);
      throw new BadRequestException(
        `Resume ${resumeId} has no associated file. Please re-upload your resume.`,
      );
    }

    const supabase = getSupabaseServiceClient();
    const bucket = resume.storageBucket || RESUME_BUCKET;

    this.logger.log(`[analyse] Downloading file from Supabase: ${bucket}/${resume.storagePath}`);

    let fileData;
    try {
      const result = await supabase
        .storage
        .from(bucket)
        .download(resume.storagePath);

      if (result.error) {
        this.logger.error(`[analyse] Supabase download error: ${result.error.message}`);
        throw new InternalServerErrorException(
          `Supabase download failed: ${result.error.message}`,
        );
      }

      fileData = result.data;
      if (!fileData) {
        this.logger.error('[analyse] Download returned empty data');
        throw new InternalServerErrorException('Download returned empty file');
      }

      this.logger.log(`[analyse] File downloaded successfully, size: ${fileData.size} bytes`);
    } catch (downloadErr: any) {
      const errorMsg = downloadErr?.message ?? 'Unknown download error';
      this.logger.error(`[analyse] File download failed: ${errorMsg}`);

      await this.markResumeFailed(resumeId, errorMsg);

      throw new InternalServerErrorException(
        `Failed to download resume file: ${errorMsg}`,
      );
    }

    let buffer: Buffer;
    try {
      this.logger.log('[analyse] Converting Blob to Buffer');
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      this.logger.log(`[analyse] Buffer conversion successful, size: ${buffer.length} bytes`);
    } catch (convErr: any) {
      const errorMsg = convErr?.message ?? 'Unknown conversion error';
      this.logger.error(`[analyse] Buffer conversion failed: ${errorMsg}`);

      await this.markResumeFailed(resumeId, errorMsg);

      throw new InternalServerErrorException(
        `Failed to convert file to buffer: ${errorMsg}`,
      );
    }

    const mimetype = resume.mimeType ?? this.inferMimetype(resume.originalFileName || resume.storagePath);
    this.logger.log(`[analyse] Detected mimetype: ${mimetype}`);

    if (!this.analysisQueue) {
      this.logger.warn('[analyse] BullMQ disabled, running inline analysis');

      try {
        await this.analysisService.analyzeResume(resume.id, buffer, mimetype);
        this.logger.log(`[analyse] Inline analysis completed for ${resumeId}`);

        return {
          resumeId,
          status: 'analyzed',
          message: 'Analysis completed inline (queue disabled)',
        };
      } catch (inlineErr: any) {
        const errorMsg = inlineErr?.message ?? 'Unknown analysis error';
        this.logger.error(`[analyse] Inline analysis failed for ${resumeId}: ${errorMsg}`);
        throw new InternalServerErrorException(
          `Resume analysis failed: ${errorMsg}`,
        );
      }
    }

    try {
      this.logger.log(`[analyse] Enqueuing BullMQ job for resume: ${resumeId}`);

      await this.analysisQueue.add(
        'analyze',
        {
          resumeId: resume.id,
          buffer: Array.from(buffer),
          mimetype,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log(`[analyse] Job successfully enqueued for resume: ${resumeId}`);
    } catch (queueErr: any) {
      const errorMsg = queueErr?.message ?? 'Unknown queue error';
      this.logger.error(`[analyse] Failed to enqueue job: ${errorMsg}`);

      await this.markResumeFailed(resumeId, errorMsg);

      throw new InternalServerErrorException(
        `Failed to queue analysis job: ${errorMsg}`,
      );
    }

    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        analysisStatus: ResumeAnalysisStatus.PROCESSING,
        analysisError: null,
      },
    });

    this.logger.log(`[analyse] Resume marked as processing: ${resumeId}`);

    return {
      resumeId,
      status: 'processing',
      message: 'Analysis started. Poll GET /resumes/:id for status updates',
    };
  }

  async listByUser(userId: string) {
    this.logger.log(`[list] Listing resumes for user: ${userId}`);

    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        userId: true,
        storageBucket: true,
        storagePath: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        analysisStatus: true,
        analysisError: true,
        analyzedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return resumes.map((resume) => this.mapResumeForClient(resume));
  }

  async getLatest(userId: string) {
    this.logger.log(`[latest] Fetching latest resume for user: ${userId}`);

    const resume = await this.prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return resume ? this.mapResumeForClient(resume) : null;
  }

  async getById(id: string, userId: string) {
    this.logger.log(`[getById] resumeId=${id} userId=${userId}`);

    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapResumeForClient(resume);
  }

  async getAnalysis(id: string, userId: string) {
    this.logger.log(`[getAnalysis] resumeId=${id} userId=${userId}`);

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

    if (!analysis) {
      throw new NotFoundException('Analysis not ready yet');
    }

    return analysis;
  }

  private async markResumeFailed(resumeId: string, message: string) {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        analysisStatus: ResumeAnalysisStatus.FAILED,
        analysisError: message,
      },
    });
  }

  private mapResumeForClient(resume: ResumeListRow) {
    return {
      ...resume,
      sizeBytes: resume.sizeBytes?.toString() ?? null,
      fileName: resume.storagePath,
      rawFile: this.publicStorageUrl(resume.storageBucket, resume.storagePath),
      status: this.toLegacyStatus(resume.analysisStatus),
      analysisStatus: resume.analysisStatus,
      analysisStatusLabel: this.toLegacyStatus(resume.analysisStatus),
    };
  }

  private publicStorageUrl(bucket: string, path: string): string | null {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    return url ? `${url}/storage/v1/object/public/${bucket}/${path}` : null;
  }

  private toLegacyStatus(status: ResumeAnalysisStatus): string {
    switch (status) {
      case ResumeAnalysisStatus.PROCESSING:
        return 'processing';
      case ResumeAnalysisStatus.COMPLETED:
        return 'analyzed';
      case ResumeAnalysisStatus.FAILED:
        return 'failed';
      case ResumeAnalysisStatus.PENDING:
      default:
        return 'uploaded';
    }
  }

  private inferMimetype(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.doc')) return 'application/msword';
    return 'application/octet-stream';
  }
}
