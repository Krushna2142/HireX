/* eslint-disable prettier/prettier */
// src/resumes/resumes.module.ts
import { Module }     from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule }          from '../../prisma/prisma.module';
import { OllamaModule }          from '../ollama/ollama.module';  // exports LlmService
import { ResumesController }     from './resumes.controller';
import { ResumesService }        from './resumes.service';
import { ResumeAnalysisService } from './resumes-analysis.service';
import { ResumesProcessor }      from './resumes.processor';

const REDIS_ENABLED =
  process.env.REDIS_ENABLED === 'true' ||
  !!process.env.REDIS_URL ||
  !!process.env.REDIS_HOST;

@Module({
  imports: [
    ...(REDIS_ENABLED ? [BullModule.registerQueue({ name: 'resume-analysis' })] : []),
    PrismaModule,
    OllamaModule,   // ← provides LlmService (Groq)
  ],
  controllers: [ResumesController],
  providers:   [
    ResumesService,
    ResumeAnalysisService,
    ...(REDIS_ENABLED ? [ResumesProcessor] : []),
  ],
  exports:     [ResumesService],
})
export class ResumesModule {}
