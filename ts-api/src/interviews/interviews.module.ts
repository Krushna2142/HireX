/**
 * Interviews Module
 *
 * Handles:
 * - AI mock interview sessions
 * - recruiter interview lifecycle
 * - candidate interview access
 * - DB-backed interview rooms
 * - real-time interview gateways
 * - reminders
 * - AI assistant hooks
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DatabaseModule } from '../database/datbase.module';
import { AuthModule } from '../auth/auth.module';
import { AIModule } from '../ai/ai.module';
import { AlertsModule } from '../alerts/alerts.module';

import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { RecruiterInterviewsService } from './recruiter-interviews.service';

import { CandidateInterviewsController } from './candidate-interviews.controller';

import { InterviewRoomsController } from './interview-rooms.controller';
import { InterviewRoomsService } from './interview-rooms.service';

import { InterviewRemindersService } from './interview-reminders.service';

import { InterviewGateway } from './gateway/interview.gateway';
import { WebRTCGateway } from './webrtc/webrtc.gateway';
import { WebRTCService } from './webrtc/webrtc.service';
import { ConnectionMetricsService } from './webrtc/connection-metrics';

@Module({
  imports: [
    PrismaModule,
    DatabaseModule,
    AuthModule,
    AIModule,
    AlertsModule,
  ],
  controllers: [
    InterviewsController,
    RecruiterInterviewsController,
    CandidateInterviewsController,
    InterviewRoomsController,
  ],
  providers: [
    InterviewsService,
    RecruiterInterviewsService,
    InterviewRoomsService,
    InterviewRemindersService,

    InterviewGateway,
    WebRTCService,
    WebRTCGateway,
    ConnectionMetricsService,
  ],
  exports: [
    InterviewsService,
    RecruiterInterviewsService,
    InterviewRoomsService,
    WebRTCService,
  ],
})
export class InterviewsModule {}