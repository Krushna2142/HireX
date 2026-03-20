// src/jobs/adapters/indeed.adapter.ts
//
// Uses RapidAPI's "Indeed Jobs API" endpoint.
// Same RAPIDAPI_KEY — one key, multiple platforms.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { PlatformAdapter, PlatformJob } from './platform.adapter';

@Injectable()
export class IndeedAdapter extends PlatformAdapter {
  readonly name = 'indeed';
  private readonly logger = new Logger(IndeedAdapter.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http:   HttpService,
  ) {
    super();
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('RAPIDAPI_KEY not set — Indeed platform disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];
    try {
      const { data } = await firstValueFrom(
        this.http.get('https://indeed12.p.rapidapi.com/jobs/search', {
          params: {
            query,
            location,
            page_id:  '1',
            locality: 'in',
          },
          headers: {
            'X-RapidAPI-Key':  this.apiKey,
            'X-RapidAPI-Host': 'indeed12.p.rapidapi.com',
          },
          timeout: 15_000,
        })
      );
      return ((data?.hits ?? []) as any[]).map(j => this.normalize(j));
    } catch (err: any) {
      this.logger.error(`Indeed fetch failed: ${err.message}`);
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    return {
      externalId:  `indeed_${j.id ?? j.trackingKey ?? Math.random()}`,
      title:       j.title         ?? '',
      company:     j.company?.name ?? '',
      location:    j.location?.label ?? '',
      description: (j.description ?? j.snippet ?? '').slice(0, 5000),
      workMode:    j.remoteWorkModel?.text?.toLowerCase().includes('remote')
                   ? 'remote' : 'hybrid',
      empType:     'full_time',
      skills:      [],
      salaryMin:   j.salary?.min  ?? null,
      salaryMax:   j.salary?.max  ?? null,
      applyUrl:    j.applyUrl     ?? j.externalApplyUrl ?? null,
      postedAt:    j.pubDate ? new Date(j.pubDate) : new Date(),
      platform:    'indeed',
    };
  }
}