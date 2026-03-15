import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { supabase } from '../lib/supabase';

@Injectable()
export class ResumesService {
  constructor(private prisma: PrismaService) {}

  async saveRawResume(file: Express.Multer.File, userId: string) {
    const fileName = `${Date.now()}-${file.originalname}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('resume-files')
      .upload(fileName, file.buffer);

    if (error) {
      throw new Error(error.message);
    }

    const fileUrl =
      `${process.env.SUPABASE_URL}/storage/v1/object/public/resume-files/${fileName}`;

    // Save resume metadata in DB (no parsedText!)
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        fileName,
        fileUrl,
        status: 'uploaded',
      },
    });

    return resume;
  }
}