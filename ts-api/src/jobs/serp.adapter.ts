import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SerpApi from 'google-search-results-nodejs';

export interface SerpJobResult {
  job_id: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  related_links?: { link: string }[];
  detected_extensions?: Record<string, unknown>;
  thumbnail?: string;
}

export interface SerpJobsResponse {
  jobs_results?: SerpJobResult[];
  search_metadata?: Record<string, unknown>;
  search_parameters?: Record<string, unknown>;
}

export interface NormalisedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string | null;
  thumbnail: string | null;
  source: 'SerpAPI';
}

@Injectable()
export class SerpAdapter {
  private search: InstanceType<typeof SerpApi.GoogleSearch> | null = null;
  private readonly logger = new Logger(SerpAdapter.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('serpApiKey');
    if (!apiKey) {
      // ✅ WARN instead of throwing — don't crash the whole app
      this.logger.warn(
        'SERPAPI_KEY is not configured. Job search will be unavailable until it is set.',
      );
    } else {
      this.search = new SerpApi.GoogleSearch(apiKey);
    }
  }

  async fetchRaw(query: string, location = 'India'): Promise<SerpJobsResponse> {
    if (!this.search) {
      this.logger.warn('SerpAPI not available — returning empty results');
      return { jobs_results: [] };
    }

    const params = {
      engine: 'google_jobs' as const,
      q: query,
      location,
      hl: 'en',
      api_key: this.config.get<string>('serpApiKey'),
    };

    return new Promise<SerpJobsResponse>((resolve, reject) => {
      this.search!.json(params, (data: SerpJobsResponse) => {
        if (!data) {
          return reject(
            new Error('SerpAdapter: No data returned from SerpAPI'),
          );
        }
        resolve(data);
      });
    });
  }

  async getJobs(query: string, location = 'India'): Promise<NormalisedJob[]> {
    const response = await this.fetchRaw(query, location);

    return (response.jobs_results ?? []).map((job) => ({
      id: job.job_id,
      title: job.title,
      company: job.company_name,
      location: job.location,
      description: job.description,
      url: job.related_links?.[0]?.link ?? null,
      thumbnail: job.thumbnail ?? null,
      source: 'SerpAPI' as const,
    }));
  }
}