import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ResumesService {
  constructor(private readonly db: DatabaseService) {}

  async saveRawResume(file: Express.Multer.File, userId: string) {
    try {
      const result = await this.db.query(
        `INSERT INTO resumes (user_id, file_name, raw_file, status, created_at)
         VALUES ($1, $2, $3, 'uploaded', NOW())
         RETURNING id, file_name, status, created_at`,
        [userId, file.originalname, file.buffer]
      );

      return { resume: result.rows[0] };
    } catch (err: any) {
      throw new InternalServerErrorException(err.message || 'Resume save failed');
    }
  }
}