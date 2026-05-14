/* eslint-disable prettier/prettier */
// src/resumes/resumes.module.ts

import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

/**
 * Resume analysis is now handled by the separate Dockerized Python AI service.
 *
 * Removed old pipeline:
 * - ResumeAnalysisService
 * - ResumesProcessor
 * - BullMQ queue
 * - Ollama/Gemini dependency from resume module
 *
 * NestJS now:
 * - uploads resume
 * - stores file in Supabase
 * - stores resume row in PostgreSQL
 * - calls Python AI service for analysis
 * - saves result in resume_analyses / resumes.analysis_json
 */
@Module({
  imports: [PrismaModule],
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}