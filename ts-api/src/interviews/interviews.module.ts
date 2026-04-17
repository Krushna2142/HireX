import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { InterviewsService } from './interviews.service';
import { InterviewGateway } from './interview.gateway';
import { InterviewsController } from './interviews.controller';
import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { CandidateInterviewsController } from './candidate-interviews.controller';
import { InterviewRoomController } from './interview-room.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [
    InterviewsController,
    RecruiterInterviewsController,
    CandidateInterviewsController,
    InterviewRoomController,
  ],
  providers: [PrismaService, InterviewsService, InterviewGateway],
  exports: [InterviewsService],
})
export class InterviewsModule {}