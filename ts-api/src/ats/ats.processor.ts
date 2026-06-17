/* eslint-disable prettier/prettier */
// ts-api/src/ats/ats.processor.ts

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { ATS_JOB, ATS_QUEUE, AtsQueuePayload } from './ats.types';
import { AtsService } from './ats.service';

@Processor(ATS_QUEUE, {
  concurrency: Number(process.env.ATS_QUEUE_CONCURRENCY ?? 4),
})
export class AtsProcessor extends WorkerHost {
  private readonly logger = new Logger(AtsProcessor.name);

  constructor(private readonly atsService: AtsService) {
    super();
  }

  async process(job: Job<AtsQueuePayload>): Promise<any> {
    switch (job.name) {
      case ATS_JOB.CHECK_APPLICATION:
        return this.atsService.processApplicationFromQueue(job.data);

      default:
        throw new Error(`Unknown ATS queue job: ${job.name}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`ATS job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`ATS job failed: ${job?.id ?? 'unknown'} ${error.message}`);
  }
}