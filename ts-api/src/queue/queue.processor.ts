import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { QUEUES } from './queue.constants';
import IORedis from 'ioredis';

@Processor(QUEUES.RESUME_ANALYSIS)
export class QueueProcessor extends WorkerHost {
  private connection;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super();

    const redisUrl = this.config.get<string>('redisUrl');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async process(job: Job<any>) {
    const { resumeId, content } = job.data;

    try {
      // TODO: Call Python AI API here for resume analysis

      await this.db.query(
        "UPDATE resumes SET status = 'completed' WHERE id = $1",
        [resumeId],
      );

      return { success: true };
    } catch (error) {
      await this.db.query(
        "UPDATE resumes SET status = 'failed' WHERE id = $1",
        [resumeId],
      );

      throw error;
    }
  }
}