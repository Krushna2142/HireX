import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { QUEUES } from './queue.constants';
import IORedis from 'ioredis';

@Processor(QUEUES.RESUME_ANALYSIS)
export class QueueProcessor extends WorkerHost {
  private connection;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    super();

    const redisUrl = this.config.get<string>('REDIS_URL');

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
      // TODO: Call Python AI API here

      await this.supabase
        .getClient()
        .from('resumes')
        .update({ status: 'completed' })
        .eq('id', resumeId);

      return { success: true };
    } catch (error) {
      await this.supabase
        .getClient()
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resumeId);

      throw error;
    }
  }
}