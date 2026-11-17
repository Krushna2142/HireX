// ts-api/src/campus/campus.processor.ts
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CAMPUS_JOB, CAMPUS_QUEUE } from './campus.constants';
import { CampusBulkService } from './campus-bulk.service';

export interface CampusJobPayload {
  batchId: string;
  actorUserId: string;
  actorRole: string;
}

@Processor(CAMPUS_QUEUE, {
  concurrency: Number(process.env.CAMPUS_QUEUE_CONCURRENCY ?? 2),
})
export class CampusProcessor extends WorkerHost {
  private readonly logger = new Logger(CampusProcessor.name);

  constructor(private readonly bulk: CampusBulkService) {
    super();
  }

  async process(job: Job<CampusJobPayload>): Promise<unknown> {
    const { batchId, actorUserId } = job.data;
    switch (job.name) {
      case CAMPUS_JOB.IMPORT_STUDENTS:
        return this.bulk.importStudents(batchId);
      case CAMPUS_JOB.BULK_STATUS:
        return this.bulk.bulkStatus(batchId, actorUserId);
      case CAMPUS_JOB.BULK_NOTIFY:
        return this.bulk.bulkNotify(batchId);
      case CAMPUS_JOB.EXPORT:
        return this.bulk.exportApplicants(batchId);
      default:
        throw new Error(`Unknown campus job: ${job.name}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`campus job completed: ${job.name} (${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`campus job failed: ${job?.id ?? 'unknown'} — ${error.message}`);
  }
}