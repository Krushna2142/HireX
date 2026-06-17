/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/app.module.ts

import { Module, OnModuleInit, Logger } from '@nestjs/common'; // 1. Added OnModuleInit and Logger
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import configuration from './config/configuration';
import { DatabaseModule } from './database/datbase.module';
import { AuthModule } from './auth/auth.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';
import { AlertsModule } from './alerts/alerts.module';
import { CandidatesModule } from './candidates/candidates.module';
import { RecruitersModule } from './recruiters/recruiters.module';
import { InterviewsModule } from './interviews/interviews.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service'; // 2. Added PrismaService import
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { BullModule } from '@nestjs/bullmq';
import { AtsModule } from './ats/ats.module';
import { getRedisConnection } from './queues/redis-connection';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    DatabaseModule,
    AlertsModule,
    AuthModule,
    ResumesModule,
    JobsModule,
    CandidatesModule,
    RecruitersModule,
    InterviewsModule,
    FeedbackModule,
    AdminModule,
    RecommendationsModule,
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    AtsModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
// 3. Implement OnModuleInit and inject PrismaService
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connected. Ensuring critical performance indexes exist...');

      // 1. GIN Index for Array Overlap (Job Search Skills)
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_jobs_required_skills 
        ON jobs USING gin (required_skills);
      `;

      // 2. B-Tree Index for Job Search Filtering & Sorting
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_jobs_status_created 
        ON jobs (status, created_at DESC);
      `;

      // 3. Composite Index for Recruiter Dashboard Analytics
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_job_applications_job_status 
        ON job_applications (job_id, status);
      `;

      this.logger.log('Database indexes verified/created successfully.');
    } catch (error) {
      // We catch the error so it doesn't crash the app on startup if indexes already exist or fail
      this.logger.error('Note: Failed to create one or more database indexes. They may already exist.', error);
    }
  }
}