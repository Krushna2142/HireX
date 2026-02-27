/* eslint-disable prettier/prettier */
//C:\Projects\Job-Crawler\ts-api\src\jobs\jobs.service.ts
import { Injectable } from '@nestjs/common';
import { SerpAdapter, NormalisedJob } from './serp.adapter';

@Injectable()
export class JobsService {
  constructor(private readonly serpAdapter: SerpAdapter) {}

  async fetchJobs(query: string, location = 'India'): Promise<NormalisedJob[]> {
    return this.serpAdapter.getJobs(query, location);
  }
}