/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
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

  async saveRawResume(file: Express.Multer.File, userId: string) {
    this.logger.log(`Upload initiated — userId: ${userId}`);
    this.logger.log(`File: ${file?.originalname} | ${file?.mimetype} | ${file?.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅' : '❌ MISSING'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ MISSING'}`);
    this.logger.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅' : '❌ MISSING'}`);

    // ✅ Declare fileName as an explicit variable before using it
    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${userId}/${Date.now()}-${sanitized}`;

    // ── Stage 1: Upload to Supabase Storage ──────────────────────
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

    // ✅ Declare rawFile as an explicit variable before using it
    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;
    this.logger.log(`File URL: ${rawFile}`);

    // ── Stage 2: Persist metadata ─────────────────────────────────
    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,       // ✅ matches @map("user_id")
          fileName,     // ✅ matches @map("file_name") — was 'filename' before
          rawFile,      // ✅ now declared above — was shorthand with no variable
          status: 'uploaded',
        },
      });

      this.logger.log(`Resume record created: ${resume.id}`);

      // ── Stage 3: Enqueue analysis ─────────────────────────────
      await this.analysisQueue.add(
        'analyze',
        {
          resumeId: resume.id,
          buffer: Array.from(file.buffer),
          mimetype: file.mimetype,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      this.logger.log(`Analysis queued for resume: ${resume.id}`);
      return { ...resume, analysisStatus: 'queued' };

    } catch (dbError) {
      this.logger.error(`Prisma insert failed: ${dbError.message}`);

      // Rollback storage if DB write fails
      await supabase.storage.from('resume-files').remove([fileName]);
      this.logger.log(`Storage rollback completed for: ${fileName}`);

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }
}