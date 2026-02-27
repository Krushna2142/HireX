import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { SupabaseService } from './database/supabase.service';
import { QueueModule } from './queue/queue.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';
import { InterviewsModule } from './interviews/interviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    QueueModule,
    ResumesModule,
    JobsModule,
    InterviewsModule
  ],
  providers: [SupabaseService]
})
export class AppModule {}