import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SerpApi from 'google-search-results-nodejs';

// ── Response types ──────────────────────────────────────────────

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

// ── Normalised output ───────────────────────────────────────────

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

// ── Adapter ─────────────────────────────────────────────────────

@Injectable()
export class SerpAdapter {
  private search: InstanceType<typeof SerpApi.GoogleSearch>;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('serpApiKey');
    if (!apiKey) {
      throw new Error('SerpAdapter: SERPAPI_KEY is not configured');
    }
    this.search = new SerpApi.GoogleSearch(apiKey);
  }

  /**
   * Raw SerpAPI call — returns the full response from Google Jobs engine.
   */
  async fetchRaw(query: string, location = 'India'): Promise<SerpJobsResponse> {
    const params = {
      engine: 'google_jobs' as const,
      q: query,
      location,
      hl: 'en',
      api_key: this.config.get<string>('serpApiKey'),
    };

    return new Promise<SerpJobsResponse>((resolve, reject) => {
      this.search.json(params, (data: SerpJobsResponse) => {
        if (!data) {
          return reject(
            new Error('SerpAdapter: No data returned from SerpAPI'),
          );
        }
        resolve(data);
      });
    });
  }

  /**
   * Fetches jobs and returns a normalised, UI-friendly array.
   */
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
