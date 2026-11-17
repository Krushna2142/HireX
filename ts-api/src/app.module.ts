/* eslint-disable prettier/prettier */
// src/app.module.ts

import { Module, OnModuleInit, Logger } from '@nestjs/common'; // 1. Added OnModuleInit and Logger
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
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
import { CampusModule } from './campus/campus.module';
import { AssistantModule } from './assistant/assistant.module';
import { getRedisConnection } from './queues/redis-connection';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    ScheduleModule.forRoot(),

    // Global limits apply to EVERY route, so they must be generous for a dashboard
    // that fires several calls per page. Strict per-endpoint limits (login, register,
    // refresh, forgot/reset password) are set with @Throttle() in auth.controller.ts.
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            name: 'short',
            ttl: Number(process.env.THROTTLE_SHORT_TTL ?? 60000), // 1 minute
            limit: Number(process.env.THROTTLE_SHORT_LIMIT ?? 300),
          },
          {
            name: 'medium',
            ttl: Number(process.env.THROTTLE_MEDIUM_TTL ?? 900000), // 15 minutes
            limit: Number(process.env.THROTTLE_MEDIUM_LIMIT ?? 3000),
          },
          {
            name: 'long',
            ttl: Number(process.env.THROTTLE_LONG_TTL ?? 3600000), // 1 hour
            limit: Number(process.env.THROTTLE_LONG_LIMIT ?? 10000),
          },
        ],
      }),
    }),

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
    CampusModule, // Add CampusModule to the imports
    AssistantModule,
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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