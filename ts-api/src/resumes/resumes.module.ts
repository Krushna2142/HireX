import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { SupabaseService } from '../database/supabase.service';

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, SupabaseService],
})
export class ResumesModule {}
