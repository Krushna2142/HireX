import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveRawResume(file: Express.Multer.File, userId: string) {
    // ── Diagnostic: log all env vars and file metadata on every request
    this.logger.log(`Upload initiated — userId: ${userId}`);
    this.logger.log(`File: ${file?.originalname} | ${file?.mimetype} | ${file?.size} bytes`);
    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ SET' : '❌ MISSING'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING'}`);
    this.logger.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING'}`);

    const sanitizedName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${userId}/${Date.now()}-${sanitizedName}`;

    // ── Stage 1: Upload binary to Supabase Storage ──────────────────
    const supabase = getSupabaseServiceClient();

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('resume-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    this.logger.log(`Supabase upload result: ${JSON.stringify({ uploadData, uploadError })}`);

    if (uploadError) {
      this.logger.error(`Storage upload failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;
    this.logger.log(`File URL: ${rawFile}`);

    // ── Stage 2: Persist metadata to database ───────────────────────
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
      return resume;

    } catch (dbError) {
      this.logger.error(`Prisma insert failed: ${dbError.message}`);
      this.logger.error(`Full error: ${JSON.stringify(dbError)}`);

      // Rollback: remove the uploaded file if DB write fails
      const { error: rollbackError } = await supabase
        .storage
        .from('resume-files')
        .remove([fileName]);

      if (rollbackError) {
        this.logger.error(`Storage rollback failed: ${rollbackError.message}`);
      } else {
        this.logger.log(`Storage rollback successful for: ${fileName}`);
      }

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }
}