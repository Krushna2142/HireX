import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseClient } from '../lib/supabase';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveRawResume(file: Express.Multer.File, userId: string) {
    const fileName = `${userId}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    const { error: uploadError } = await getSupabaseClient()
      .storage
      .from('resume-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(`Supabase upload failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    const rawFile = `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;

    try {
      return await this.prisma.resume.create({
        data: {
          userId,
          fileName,
          rawFile,
          status: 'uploaded',
        },
      });
    } catch (dbError) {
      this.logger.error(`Database insert failed: ${dbError.message}`);

      // Rollback — remove uploaded file if DB write fails
      await getSupabaseClient()
        .storage
        .from('resume-files')
        .remove([fileName]);

      throw new InternalServerErrorException(
        'Failed to save resume metadata. Upload rolled back.',
      );
    }
  }
}