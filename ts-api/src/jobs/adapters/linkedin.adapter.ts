// src/jobs/adapters/linkedin.adapter.ts
//
// Uses RapidAPI's "LinkedIn Jobs Search" endpoint.
// Sign up at rapidapi.com → search "LinkedIn Jobs Search" → subscribe free tier.
// Set RAPIDAPI_KEY in your backend .env

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { PlatformAdapter, PlatformJob } from './platform.adapter';

@Injectable()
export class LinkedInAdapter extends PlatformAdapter {
  readonly name = 'linkedin';
  private readonly logger = new Logger(LinkedInAdapter.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http:   HttpService,
  ) {
    super();
    this.apiKey = this.config.get<string>('RAPIDAPI_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('RAPIDAPI_KEY not set — LinkedIn platform disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];
    try {
      const { data } = await firstValueFrom(
        this.http.get('https://linkedin-jobs-search.p.rapidapi.com/', {
          params: {
            query,
            location,
            distance:   '25',
            page_number: '0',
          },
          headers: {
            'X-RapidAPI-Key':  this.apiKey,
            'X-RapidAPI-Host': 'linkedin-jobs-search.p.rapidapi.com',
          },
          timeout: 15_000,
        })
      );
      return ((data ?? []) as any[]).map(j => this.normalize(j));
    } catch (err: any) {
      this.logger.error(`LinkedIn fetch failed: ${err.message}`);
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    return {
      externalId:  `linkedin_${j.linkedin_job_url_cleaned ?? j.job_title}`,
      title:       j.job_title       ?? '',
      company:     j.company_name    ?? '',
      location:    j.job_location    ?? '',
      description: (j.job_summary    ?? '').slice(0, 5000),
      workMode:    this.inferWorkMode(j),
      empType:     this.inferEmpType(j.job_employment_type ?? ''),
      skills:      [],
      salaryMin:   null,
      salaryMax:   null,
      applyUrl:    j.linkedin_job_url_cleaned ?? null,
      postedAt:    new Date(),
      platform:    'linkedin',
    };
  }

  private inferWorkMode(j: any): string {
    const text = `${j.job_title ?? ''} ${j.job_summary ?? ''}`.toLowerCase();
    if (text.includes('remote')) return 'remote';
    if (text.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  private inferEmpType(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract') || s.includes('freelance')) return 'contract';
    if (s.includes('part'))     return 'part_time';
    if (s.includes('intern'))   return 'internship';
    return 'full_time';
  }
}