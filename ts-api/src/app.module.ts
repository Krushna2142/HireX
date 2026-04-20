/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/app.module.ts

import { Module }                    from '@nestjs/common';
import { APP_GUARD }                 from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule }                from '@nestjs/bullmq';
import { ScheduleModule }            from '@nestjs/schedule';  // ← add this

import configuration                 from './config/configuration';
import { DatabaseModule }            from './database/datbase.module';
import { AuthModule }                from './auth/auth.module';
import { ResumesModule }             from './resumes/resumes.module';
import { JobsModule }                from './jobs/jobs.module';
import { AlertsModule }              from './alerts/alerts.module';
import { CandidatesModule }          from './candidates/candidates.module';
import { RecruitersModule }          from './recruiters/recruiters.module';
import { InterviewsModule }          from './interviews/interviews.module';
import { LivekitModule }             from './livekit/livekit.module';
import { RecommendationsModule }     from './recommendations/recommendatyions.module';
import { OllamaModule }              from './ollama/ollama.module';
import { FeedbackModule }            from './feedback/feedback.module';
import { AdminModule }               from './admin/admin.module';
import { PrismaModule }              from '../prisma/prisma.module';
import { JwtAuthGuard }              from './auth/guards/jwt-auth.guard';
import { RolesGuard }                from './auth/guards/roles.guard';  // ← add this

const REDIS_ENABLED =
  process.env.REDIS_ENABLED === 'true' ||
  !!process.env.REDIS_URL ||
  !!process.env.REDIS_HOST;

@Module({
  imports: [
    // ── Global config ───────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load:     [configuration],
    }),

    // ── Cron scheduler — required for JobsSyncService @Cron ─────────────────
    ScheduleModule.forRoot(),

    // ── BullMQ — enabled only when Redis is configured ──────────────────────
    ...(REDIS_ENABLED
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject:  [ConfigService],
            useFactory: (config: ConfigService) => {
              const redisUrl = config.get<string>('redis.url');

              // Prefer connection URL (Upstash/Railway provide this)
              if (redisUrl) {
                return {
                  connection: { url: redisUrl },
                  defaultJobOptions: {
                    attempts:         3,
                    backoff:          { type: 'exponential', delay: 5_000 },
                    removeOnComplete: 100,
                    removeOnFail:     50,
                  },
                };
              }

              const redis = config.get('redis');
              return {
                connection: {
                  host:     redis.host,
                  port:     redis.port,
                  password: redis.password,
                  ...(redis.tls && { tls: { rejectUnauthorized: false } }),
                },
                defaultJobOptions: {
                  attempts:         3,
                  backoff:          { type: 'exponential', delay: 5_000 },
                  removeOnComplete: 100,
                  removeOnFail:     50,
                },
              };
            },
          }),
        ]
      : []),

    // ── Feature modules ──────────────────────────────────────────────────────
    PrismaModule,
    DatabaseModule,
    OllamaModule,
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
    LivekitModule,
  ],

  providers: [
    // Guard execution order matters — JWT authenticates first,
    // Roles authorises second. NestJS respects registration order.
    {
      provide:  APP_GUARD,
      useClass: JwtAuthGuard,   // Step 1: validates token → sets request.user
    },
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,     // Step 2: checks request.user.role vs @Roles()
    },
  ],
})
export class AppModule {}
