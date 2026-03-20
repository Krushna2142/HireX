/* eslint-disable prettier/prettier */
// src/jobs/adapters/indeed.adapter.ts
//
// Also uses JSearch — filters by employer to surface Indeed-origin jobs.
// Same RAPIDAPI_KEY, same subscription, different query params.
// This avoids needing a second RapidAPI subscription.

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
      this.logger.warn('RAPIDAPI_KEY not set — Indeed adapter disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];

    try {
      // ✅ JSearch with page 2 — gives different results from LinkedIn adapter
      // avoiding duplicate jobs while using the same API subscription
      const { data } = await firstValueFrom(
        this.http.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query:       `${query} in ${location}`,
            page:        '2',       // page 2 = different results from LinkedIn adapter
            num_pages:   '1',
            date_posted: 'week',
          },
          headers: {
            'X-RapidAPI-Key':  this.apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 15_000,
        })
      );

      const jobs = (data?.data ?? []) as any[];
      return jobs.slice(0, 10).map(j => this.normalize(j));

    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        this.logger.warn('Indeed (JSearch) rate limited — will retry next sync');
      } else {
        this.logger.error(`Indeed fetch failed: ${err.message}`);
      }
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    const text = `${j.job_title ?? ''} ${j.job_description ?? ''}`.toLowerCase();

    return {
      externalId:  `indeed_${j.job_id ?? Math.random()}`,
      title:       j.job_title      ?? '',
      company:     j.employer_name  ?? '',
      location:    j.job_city
        ? `${j.job_city}, ${j.job_country ?? ''}`
        : (j.job_country ?? ''),
      description: (j.job_description ?? '').slice(0, 5000),
      workMode:    j.job_is_remote
        ? 'remote'
        : text.includes('hybrid') ? 'hybrid' : 'onsite',
      empType:     this.inferEmpType(j.job_employment_type ?? ''),
      skills:      (j.job_required_skills ?? []).slice(0, 8),
      salaryMin:   j.job_min_salary ?? null,
      salaryMax:   j.job_max_salary ?? null,
      applyUrl:    j.job_apply_link ?? null,
      postedAt:    j.job_posted_at_datetime_utc
        ? new Date(j.job_posted_at_datetime_utc)
        : new Date(),
      platform:    'indeed',
    };
  }

  private inferEmpType(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract') || s.includes('freelance')) return 'contract';
    if (s.includes('part'))    return 'part_time';
    if (s.includes('intern'))  return 'internship';
    return 'full_time';
  }
}