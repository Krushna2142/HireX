/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
// ts-api/src/jobs/jobs-sync.service.ts
//
// External job ingestion ONLY (SerpAPI + RapidAPI/JSearch).
// Recruiter posting / apply / status flows live in jobs.service.ts and are untouched.
//
// Fixes vs previous version:
//  - Null-safe normalization (JSearch/SerpAPI often return null description/title/company;
//    the old code passed them straight into Prisma -> NOT NULL violation -> every insert
//    threw -> caught -> returned false -> "0 new jobs" forever).
//  - Quota-aware cooldown per provider (429/403 stops hammering for 6h).
//  - Real logging + returned stats + SSE emit so the feed revalidates.
//  - Manual trigger (runSync) in addition to cron.
//  - System recruiter created with null passwordHash (valid, same as OAuth users).
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsStreamService } from './jobs-stream.service';

export type SyncProvider = 'serpapi' | 'jsearch';

export interface ProviderStats {
  provider: SyncProvider;
  enabled: boolean;
  fetched: number;
  inserted: number;
  duplicates: number;
  failed: number;
  error?: string;
  cooldownUntil?: number;
}

export interface SyncStats {
  trigger: 'cron' | 'manual';
  startedAt: string;
  finishedAt: string;
  totalFetched: number;
  totalInserted: number;
  totalDuplicates: number;
  totalFailed: number;
  providers: ProviderStats[];
}

interface NormalizedExternalJob {
  externalId: string;
  source: 'serpapi' | 'linkedin' | 'indeed';
  title: string;
  companyName: string;
  location: string;
  description: string;
  requiredSkills: string[];
  employmentType: string;
  workMode: string;
  salaryMin: number | null;
  salaryMax: number | null;
  applyUrl: string | null;
  postedAt: Date;
}

const QUERIES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'DevOps Engineer',
  'Product Manager',
];

const COMMON_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
  'react', 'angular', 'vue', 'node.js', 'express', 'nestjs', 'django', 'flask',
  'spring', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'ci/cd', 'graphql',
  'rest', 'microservices', 'agile', 'scrum', 'machine learning', 'sql',
];

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h after 429/403

@Injectable()
export class JobsSyncService {
  private readonly logger = new Logger(JobsSyncService.name);
  private readonly cooldown = new Map<SyncProvider, number>();
  private lastStats: SyncStats | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly stream: JobsStreamService,
  ) {}

  private serpKey(): string {
    return (
      this.config.get<string>('serpApiKey') ??
      this.config.get<string>('SERPAPI_KEY') ??
      process.env.SERPAPI_KEY ??
      ''
    );
  }

  private rapidKey(): string {
    return (
      this.config.get<string>('rapidApiKey') ??
      this.config.get<string>('RAPIDAPI_KEY') ??
      process.env.RAPIDAPI_KEY ??
      ''
    );
  }

  getStatus() {
    const now = Date.now();
    return {
      running: this.running,
      lastRun: this.lastStats,
      providers: {
        serpapi: {
          enabled: Boolean(this.serpKey()),
          cooldownUntil: this.cooldown.get('serpapi') ?? null,
          cooling: (this.cooldown.get('serpapi') ?? 0) > now,
        },
        jsearch: {
          enabled: Boolean(this.rapidKey()),
          cooldownUntil: this.cooldown.get('jsearch') ?? null,
          cooling: (this.cooldown.get('jsearch') ?? 0) > now,
        },
      },
    };
  }

  @Cron('0 */6 * * *')
  async cronSync() {
    await this.runSync('cron');
  }

  async runSync(trigger: 'cron' | 'manual'): Promise<SyncStats> {
    if (this.running) {
      this.logger.warn('Sync already running; skipping overlapping run.');
      return this.lastStats ?? this.emptyStats(trigger);
    }
    this.running = true;
    const startedAt = new Date();
    const providers: ProviderStats[] = [];

    try {
      // JSearch (RapidAPI) first, SerpAPI as second source. Both run unless cooling.
      providers.push(await this.syncProvider('jsearch', trigger));
      providers.push(await this.syncProvider('serpapi', trigger));

      const stats: SyncStats = {
        trigger,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        totalFetched: providers.reduce((s, p) => s + p.fetched, 0),
        totalInserted: providers.reduce((s, p) => s + p.inserted, 0),
        totalDuplicates: providers.reduce((s, p) => s + p.duplicates, 0),
        totalFailed: providers.reduce((s, p) => s + p.failed, 0),
        providers,
      };
      this.lastStats = stats;

      this.logger.log(
        `[sync:${trigger}] fetched=${stats.totalFetched} inserted=${stats.totalInserted} dup=${stats.totalDuplicates} failed=${stats.totalFailed}`,
      );

      if (stats.totalInserted > 0) {
        this.stream.emitJobsSynced({
          synced: stats.totalFetched,
          newJobs: stats.totalInserted,
          platforms: providers.filter((p) => p.inserted > 0).map((p) => p.provider),
        });
      }
      return stats;
    } finally {
      this.running = false;
    }
  }

  private emptyStats(trigger: 'cron' | 'manual'): SyncStats {
    const now = new Date().toISOString();
    return {
      trigger,
      startedAt: now,
      finishedAt: now,
      totalFetched: 0,
      totalInserted: 0,
      totalDuplicates: 0,
      totalFailed: 0,
      providers: [],
    };
  }

  private async syncProvider(
    provider: SyncProvider,
    trigger: 'cron' | 'manual',
  ): Promise<ProviderStats> {
    const stats: ProviderStats = {
      provider,
      enabled: provider === 'serpapi' ? Boolean(this.serpKey()) : Boolean(this.rapidKey()),
      fetched: 0,
      inserted: 0,
      duplicates: 0,
      failed: 0,
    };

    if (!stats.enabled) {
      stats.error = 'API key not configured';
      this.logger.warn(`[sync:${provider}] skipped: API key missing`);
      return stats;
    }
    const coolUntil = this.cooldown.get(provider) ?? 0;
    if (Date.now() < coolUntil) {
      stats.cooldownUntil = coolUntil;
      stats.error = 'provider cooling down after rate-limit/auth error';
      this.logger.warn(`[sync:${provider}] skipped: cooling until ${new Date(coolUntil).toISOString()}`);
      return stats;
    }

    const systemRecruiterId = await this.getSystemRecruiterId();

    for (const query of QUERIES) {
      let raw: any[] = [];
      try {
        raw =
          provider === 'jsearch'
            ? await this.fetchJSearch(query)
            : await this.fetchSerpApi(query);
      } catch (err: any) {
        const status = err?.response?.status as number | undefined;
        stats.error = err?.message ?? 'fetch failed';
        if (status === 429 || status === 403 || status === 401) {
          this.cooldown.set(provider, Date.now() + COOLDOWN_MS);
          stats.cooldownUntil = this.cooldown.get(provider);
          this.logger.error(
            `[sync:${provider}] HTTP ${status} -> cooldown 6h. Check quota/key.`,
          );
          return stats; // stop this provider entirely
        }
        this.logger.warn(`[sync:${provider}] query="${query}" fetch failed: ${stats.error}`);
        continue;
      }

      stats.fetched += raw.length;
      const normalized = raw
        .map((item) =>
          provider === 'jsearch'
            ? this.normalizeJSearch(item)
            : this.normalizeSerp(item),
        )
        .filter((j): j is NormalizedExternalJob => Boolean(j));

      for (const job of normalized) {
        try {
          const inserted = await this.upsertJob(job, systemRecruiterId);
          if (inserted) stats.inserted += 1;
          else stats.duplicates += 1;
        } catch (err: any) {
          stats.failed += 1;
          this.logger.warn(
            `[sync:${provider}] insert failed for "${job.title}": ${err?.message ?? err}`,
          );
        }
      }

      // gentle pacing between queries to stay under free-tier burst limits
      await new Promise((r) => setTimeout(r, 1200));
    }

    this.logger.log(
      `[sync:${provider}:${trigger}] fetched=${stats.fetched} inserted=${stats.inserted} dup=${stats.duplicates} failed=${stats.failed}`,
    );
    return stats;
  }

  // ── Providers ────────────────────────────────────────────────────────────
  private async fetchJSearch(query: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get('https://jsearch.p.rapidapi.com/search', {
        params: { query, page: '1', num_pages: '1', date_posted: 'week' },
        headers: {
          'X-RapidAPI-Key': this.rapidKey(),
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
        timeout: 20_000,
      }),
    );
    return Array.isArray(data?.data) ? data.data : [];
  }

  private async fetchSerpApi(query: string): Promise<any[]> {
    const { data } = await firstValueFrom(
      this.http.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_jobs',
          q: `${query} jobs`,
          location: 'India',
          hl: 'en',
          gl: 'in',
          api_key: this.serpKey(),
        },
        timeout: 20_000,
      }),
    );
    if (data?.error) throw new Error(String(data.error));
    return Array.isArray(data?.jobs_results) ? data.jobs_results : [];
  }

  // ── Normalization (null-safe) ────────────────────────────────────────────
  private normalizeJSearch(j: any): NormalizedExternalJob | null {
    const title = this.str(j?.job_title);
    const company = this.str(j?.employer_name) || 'Unknown Company';
    if (!title) return null;
    const city = this.str(j?.job_city);
    const country = this.str(j?.job_country);
    const location = [city, country].filter(Boolean).join(', ') || 'Remote';
    const description =
      this.str(j?.job_description) || `${title} at ${company}.`;
    const externalId = this.str(j?.job_id) || this.hash(`${title}|${company}|${location}`);
    return {
      externalId: `jsearch_${externalId}`,
      source: 'linkedin',
      title,
      companyName: company,
      location,
      description: description.slice(0, 8000),
      requiredSkills: this.extractSkills(description),
      employmentType: this.inferEmpType(this.str(j?.job_employment_type)),
      workMode: j?.job_is_remote ? 'remote' : this.inferWorkMode(description),
      salaryMin: this.num(j?.job_min_salary),
      salaryMax: this.num(j?.job_max_salary),
      applyUrl: this.str(j?.job_apply_link) || null,
      postedAt: this.date(j?.job_posted_at_datetime_utc),
    };
  }

  private normalizeSerp(j: any): NormalizedExternalJob | null {
    const title = this.str(j?.title);
    const company = this.str(j?.company_name) || 'Unknown Company';
    if (!title) return null;
    const location = this.str(j?.location) || 'India';
    const description = this.str(j?.description) || `${title} at ${company}.`;
    const rawId = this.str(j?.job_id);
    const externalId = rawId
      ? rawId.length > 200
        ? this.hash(rawId)
        : rawId
      : this.hash(`${title}|${company}|${location}`);
    const extensions = j?.detected_extensions ?? {};
    return {
      externalId: `serp_${externalId}`,
      source: 'serpapi',
      title,
      companyName: company,
      location,
      description: description.slice(0, 8000),
      requiredSkills: this.extractSkills(description),
      employmentType: this.inferEmpType(this.str(extensions?.schedule_type)),
      workMode: this.inferWorkMode(`${title} ${description}`),
      salaryMin: null,
      salaryMax: null,
      applyUrl:
        this.str(j?.related_links?.[0]?.link) || this.str(j?.share_link) || null,
      postedAt: this.date(extensions?.posted_at),
    };
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  private async upsertJob(
    job: NormalizedExternalJob,
    systemRecruiterId: string,
  ): Promise<boolean> {
    const dedupHash = this.hash(
      `${job.title}|${job.companyName}|${job.location}|${job.employmentType}`.toLowerCase(),
    );

    const existing = await this.prisma.job.findFirst({
      where: {
        OR: [{ externalId: job.externalId }, { externalId: dedupHash }],
      },
      select: { id: true },
    });
    if (existing) return false;

    await this.prisma.job.create({
      data: {
        externalId: job.externalId,
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        description: job.description,
        requiredSkills: job.requiredSkills,
        employmentType: job.employmentType,
        workMode: job.workMode,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: 'INR',
        applyUrl: job.applyUrl,
        status: 'PUBLISHED',
        source: job.source,
        publishedAt: job.postedAt,
        recruiterUserId: systemRecruiterId,
      },
    });
    return true;
  }

  private async getSystemRecruiterId(): Promise<string> {
    const email = 'system@hirex.jobs';
    const existing = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.user.create({
      data: {
        email,
        fullName: 'HireX System',
        role: 'RECRUITER',
        passwordHash: null, // system account never logs in (same as OAuth users)
        emailVerified: true,
        isActive: true,
      },
      select: { id: true },
    });
    return created.id;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private str(v: unknown): string {
    return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
  }
  private num(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  private date(v: unknown): Date {
    if (typeof v === 'string' && v.trim()) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }
  private hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }
  private extractSkills(text: string): string[] {
    const lower = (text ?? '').toLowerCase();
    return COMMON_SKILLS.filter((s) => lower.includes(s)).slice(0, 12);
  }
  private inferEmpType(value: string): string {
    const v = (value ?? '').toLowerCase();
    if (v.includes('contract') || v.includes('freelance')) return 'contract';
    if (v.includes('part')) return 'part_time';
    if (v.includes('intern')) return 'internship';
    return 'full_time';
  }
  private inferWorkMode(text: string): string {
    const v = (text ?? '').toLowerCase();
    if (v.includes('remote')) return 'remote';
    if (v.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }
}