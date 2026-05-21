/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/app.module.ts

import { Module } from '@nestjs/common';
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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

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
export class AppModule {}