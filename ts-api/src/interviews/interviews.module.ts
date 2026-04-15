/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { OllamaModule } from '../ollama/ollama.module';
import { DatabaseModule } from '../database/datbase.module';
import { PrismaModule } from '../../prisma/prisma.module';

import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { RecruiterInterviewsService } from './recruiter-interviews.service';
import { InterviewRemindersService } from './interview-reminders.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 30_000 }),
    ScheduleModule.forRoot(),
    AuthModule,
    OllamaModule,
    DatabaseModule,
    PrismaModule,
  ],
  controllers: [InterviewsController, RecruiterInterviewsController],
  providers: [InterviewsService, RecruiterInterviewsService, InterviewRemindersService],
})
export class InterviewsModule {}