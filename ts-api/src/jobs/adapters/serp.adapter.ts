// src/jobs/adapters/serp.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { HttpService }        from '@nestjs/axios';
import { firstValueFrom }     from 'rxjs';
import { PlatformAdapter, PlatformJob } from './platform.adapter';
import { createHash } from 'crypto';

@Injectable()
export class SerpPlatformAdapter extends PlatformAdapter {
  readonly name = 'serpapi';
  private readonly logger = new Logger(SerpPlatformAdapter.name);
  private readonly apiKey: string;

  constructor(
    private readonly config:  ConfigService,
    private readonly http:    HttpService,
  ) {
    super();
    // ✅ One consistent key name across the entire codebase
    this.apiKey = this.config.get<string>('SERPAPI_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('SERPAPI_KEY not set — SerpAPI platform disabled');
    }
  }

  async fetchJobs(query: string, location = 'India'): Promise<PlatformJob[]> {
    if (!this.apiKey) return [];
    try {
      const { data } = await firstValueFrom(
        this.http.get('https://serpapi.com/search.json', {
          params: {
            engine:   'google_jobs',
            q:        query,
            location,
            hl:       'en',
            gl:       'in',
            api_key:  this.apiKey,
          },
          timeout: 15_000,
        })
      );
      return ((data?.jobs_results ?? []) as any[]).map(j => this.normalize(j));
    } catch (err: any) {
      this.logger.error(`SerpAPI fetch failed: ${err.message}`);
      return [];
    }
  }

  private normalize(j: any): PlatformJob {
    const rawId = j.job_id ?? '';
    const externalId = rawId.length > 255
      ? createHash('sha256').update(rawId).digest('hex')
      : rawId;

    const text = `${j.title ?? ''} ${j.description ?? ''}`.toLowerCase();

    const quals = (j.job_highlights ?? [])
      .find((h: any) => h.title?.toLowerCase().includes('qualif'));

    const SKILLS = [
      'javascript','typescript','python','java','go','rust',
      'react','next.js','vue','angular','node.js','nestjs',
      'postgresql','mysql','mongodb','redis','aws','gcp',
      'azure','docker','kubernetes','graphql','rest','git','sql',
    ];
    const skillText = (quals?.items ?? []).join(' ').toLowerCase();
    const skills = SKILLS.filter(s => skillText.includes(s));

    return {
      externalId,
      title:       j.title       ?? '',
      company:     j.company_name ?? '',
      location:    j.location    ?? '',
      description: (j.description ?? '').slice(0, 5000),
      workMode:    text.includes('remote') ? 'remote'
                 : text.includes('hybrid') ? 'hybrid' : 'hybrid',
      empType:     this.inferEmpType(j.detected_extensions?.schedule_type ?? ''),
      skills,
      salaryMin:   null,
      salaryMax:   null,
      applyUrl:    j.related_links?.[0]?.link ?? j.share_link ?? null,
      postedAt:    new Date(),
      platform:    'serpapi',
    };
  }

  private inferEmpType(s: string): string {
    s = s.toLowerCase();
    if (s.includes('contract')) return 'contract';
    if (s.includes('part'))     return 'part_time';
    if (s.includes('intern'))   return 'internship';
    return 'full_time';
  }
}