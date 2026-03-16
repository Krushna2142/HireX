/* eslint-disable prettier/prettier */
// src/resumes/resumes.module.ts

import { Module }     from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule }          from '../../prisma/prisma.module';
import { ResumesController }     from './resumes.controller';
import { ResumesService }        from './resumes.service';
import { ResumeAnalysisService } from './resumes-analysis.service';
import { ResumesProcessor }      from './resumes.processor';
import { PythonNlpService }      from './Python-Nlp.service';

@Module({
  imports: [
    // HttpModule for PythonNlpService → calls the spaCy Render service
    HttpModule.register({
      timeout:      120_000,   // Render free tier cold starts can be slow
      maxRedirects: 3,
    }),

    // BullMQ queue for async analysis jobs
    BullModule.registerQueue({ name: 'resume-analysis' }),

    // Prisma for DB access
    PrismaModule,

    // ✅ OllamaModule intentionally NOT imported here —
    //    resume analysis now uses Python spaCy, not Groq/LLM
  ],
  controllers: [ResumesController],
  providers: [
    ResumesService,
    ResumeAnalysisService,
    ResumesProcessor,
    PythonNlpService,    // ✅ HTTP client for Python spaCy API
  ],
  exports: [ResumesService],
})
export class ResumesModule {}