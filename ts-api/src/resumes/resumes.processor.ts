/* eslint-disable prettier/prettier */
// src/resumes/resumes.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ResumeAnalysisService } from './resumes-analysis.service';

export interface ResumeAnalysisJob {
  resumeId: string;
  buffer: number[]; // Buffer serialized as number array for queue
  mimetype: string;
}

@Processor('resume-analysis')
export class ResumesProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumesProcessor.name);

  constructor(private readonly analysisService: ResumeAnalysisService) {
    super();
  }

  async process(job: Job<ResumeAnalysisJob>): Promise<void> {
    const { resumeId, buffer, mimetype } = job.data;
    this.logger.log(`Processing job ${job.id} for resume ${resumeId}`);

    const buf = Buffer.from(buffer);
    await this.analysisService.analyzeResume(resumeId, buf, mimetype);
  }
}