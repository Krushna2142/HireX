import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SupabaseService } from '../database/supabase.service';
import { QUEUES } from '../queue/queue.constants';

@Injectable()
export class ResumesService {
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue(QUEUES.RESUME_ANALYSIS)
    private readonly queue: Queue,
  ) {}

  async create(content: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('resumes')
      .insert({
        user_id: userId,
        content,
        status: 'processing',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await this.queue.add('analyze', {
      resumeId: data.id,
      content,
    });

    return data;
  }
}