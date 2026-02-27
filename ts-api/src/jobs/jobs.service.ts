/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { SerpAdapter } from './serp.adapter';

@Injectable()
export class JobsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly serpAdapter: SerpAdapter,
  ) { }

  /**
   * Fetch jobs from SerpAPI and store in DB
   */
  async fetchAndStore(query: string, location = 'India') {
    const jobs = await this.serpAdapter.getJobs(query, location);

    if (!jobs.length) return [];

    const { data, error } = await this.supabase
      .getClient()
      .from('jobs')
      .upsert(
        jobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        })),
        { onConflict: 'id' },
      )
      .select();

    if (error) {
      throw new Error(`DB insert failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Semantic match using pgvector
   */
  async match(resumeId: string) {
    const { data: resume } = await this.supabase
      .getClient()
      .from('resumes')
      .select('embedding')
      .eq('id', resumeId)
      .single();

    if (!resume?.embedding) {
      throw new Error('Resume embedding not found');
    }

    const { data, error } = await this.supabase.rpc('match_jobs', {
      query_embedding: resume.embedding,
      match_threshold: 0.7,
      match_count: 10,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
