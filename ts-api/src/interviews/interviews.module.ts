import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

import { InterviewsController } from './interviews.controller';
import { InterviewGateway } from './interview.gateway';
import { InterviewsService } from './interviews.service';

import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { RecruiterInterviewsService } from './recruiter-interviews.service';

import { CandidateInterviewsController } from './candidate-interviews.controller';
import { InterviewRoomController } from './interview-room.controller';

import { DatabaseModule } from '../database/datbase.module';

@Module({
  imports: [
    JwtModule.register({}),
    DatabaseModule, // required because RecruiterInterviewsService injects DatabaseService
  ],
  controllers: [
    InterviewsController,
    RecruiterInterviewsController,
    CandidateInterviewsController,
    InterviewRoomController,
  ],
  providers: [
    PrismaService,
    InterviewsService,
    RecruiterInterviewsService, // <-- missing provider (main crash reason)
    InterviewGateway,
  ],
  exports: [InterviewsService, RecruiterInterviewsService],
})
export class InterviewsModule {}