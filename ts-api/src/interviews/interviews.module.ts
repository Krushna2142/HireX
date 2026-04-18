/**
 * Interviews Module (ENHANCED)
 * File: ts-api/src/interviews/interviews.module.ts
 * 
 * Added: WebRTC service, metrics, connection management
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

import { InterviewsController } from './interviews.controller';
import { InterviewGateway } from './gateway/interview.gateway';
import { InterviewsService } from './interviews.service';
import { WebRTCGateway } from './webrtc/webrtc.gateway';
import { WebRTCService } from './webrtc/webrtc.service';
import { ConnectionMetricsService } from './webrtc/connection-metrics';

import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { RecruiterInterviewsService } from './recruiter-interviews.service';

import { CandidateInterviewsController } from './candidate-interviews.controller';
import { InterviewRoomController } from './interview-room.controller';
import { InterviewRoomsController } from './interview-rooms.controller';
import { InterviewRoomsService } from './interview-rooms.service';
import { InterviewRemindersService } from './interview-reminders.service';

import { DatabaseModule } from '../database/datbase.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? config.get<string>('JWT_SECRET') ?? 'fallback-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  controllers: [
    InterviewsController,
    RecruiterInterviewsController,
    CandidateInterviewsController,
    InterviewRoomController,
    InterviewRoomsController,
  ],
  providers: [
    PrismaService,
    InterviewsService,
    RecruiterInterviewsService,
    InterviewRoomsService,
    InterviewRemindersService,
    // ✨ NEW WebRTC providers
    WebRTCService,
    WebRTCGateway,
    ConnectionMetricsService,
  ],
  exports: [InterviewsService, RecruiterInterviewsService, WebRTCService],
})
export class InterviewsModule {}