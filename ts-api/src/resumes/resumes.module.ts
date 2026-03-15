/* eslint-disable prettier/prettier */
// src/resumes/resumes.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumeAnalysisService } from './resumes-analysis.service';
import { ResumesProcessor } from './resumes.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'resume-analysis' }),
  ],
  controllers: [ResumesController],
  providers: [ResumesService, ResumeAnalysisService, ResumesProcessor],
})
export class ResumesModule {}