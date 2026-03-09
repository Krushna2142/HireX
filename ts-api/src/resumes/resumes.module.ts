import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { SupabaseService } from '../database/supabase.service';
import { QueueModule } from '../queue/queue.module';  // ✅ Add this import

@Module({
  imports: [QueueModule],  // ✅ Import QueueModule to get access to the Bull queue
  controllers: [ResumesController],
  providers: [ResumesService, SupabaseService],
})
export class ResumesModule {}