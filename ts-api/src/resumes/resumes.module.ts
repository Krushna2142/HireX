/* eslint-disable prettier/prettier */
// src/resumes/resumes.module.ts

import { Module }        from '@nestjs/common';
import { BullModule }    from '@nestjs/bullmq';
import { OllamaModule }  from '../ollama/ollama.module';
import { PrismaModule }  from '../../prisma/prisma.module';
import { ResumesController }     from './resumes.controller';
import { ResumesService }        from './resumes.service';
import { ResumeAnalysisService } from './resumes-analysis.service';
import { ResumesProcessor }      from './resumes.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'resume-analysis' }),
    OllamaModule,    // provides LlmService → ResumeAnalysisService
    PrismaModule,
  ],
  controllers: [ResumesController],
  providers:   [ResumesService, ResumeAnalysisService, ResumesProcessor],
  exports:     [ResumesService],   // exported so other modules can call getLatest()
})
export class ResumesModule {}