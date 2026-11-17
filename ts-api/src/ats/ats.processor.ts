// ts-api/src/ats/ats.processor.ts
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  ATS_JOB,
  ATS_QUEUE,
  AtsQueuePayload,
  AtsBatchQueuePayload,
} from './ats.types';
import { AtsService } from './ats.service';

@Processor(ATS_QUEUE, {
  concurrency: Number(process.env.ATS_QUEUE_CONCURRENCY ?? 4),
})
export class AtsProcessor extends WorkerHost {
  private readonly logger = new Logger(AtsProcessor.name);

  constructor(private readonly atsService: AtsService) {
    super();
  }

  async process(job: Job<AtsQueuePayload | AtsBatchQueuePayload>): Promise<any> {
    switch (job.name) {
      case ATS_JOB.CHECK_APPLICATION:
        return this.atsService.processApplicationFromQueue(job.data as AtsQueuePayload);
      case ATS_JOB.BATCH_CHECK:
        return this.processBatch(job.data as AtsBatchQueuePayload);
      default:
        throw new Error(`Unknown ATS queue job: ${job.name}`);
    }
  }

  private async processBatch(payload: AtsBatchQueuePayload) {
    this.logger.log(`[Batch ATS] Processing ${payload.applicationIds.length} applications`);
    // Batch is handled by individual CHECK_APPLICATION jobs
    // This is a fallback for direct batch processing
    for (const appId of payload.applicationIds) {
      try {
        await this.atsService.processApplicationFromQueue({
          applicationId: appId,
          jobId: payload.jobId,
          recruiterUserId: payload.recruiterUserId,
          batchId: payload.batchId,
          source: 'bulk',
        });
      } catch (err) {
        this.logger.error(`Batch item failed for ${appId}: ${(err as Error).message}`);
      }
    }
    return { processed: payload.applicationIds.length };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`ATS job completed: ${job.id} (${job.name})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`ATS job failed: ${job?.id ?? 'unknown'} - ${error.message}`);
  }
}