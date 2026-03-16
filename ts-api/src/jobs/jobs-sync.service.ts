/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/jobs/jobs-sync.service.ts
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../database/database.service';

// ── Queries we proactively sync from SerpAPI ──────────────────────────────────
// Add more to expand coverage. Each query × each location = one API call.
// Keep total calls under your SerpAPI plan's monthly limit.

const SYNC_QUERIES = [
  'software engineer',
  'frontend developer',
  'backend developer',
  'full stack developer',
  'data engineer',
  'DevOps engineer',
  'product manager',
  'UI UX designer',
  'machine learning engineer',
  'cloud architect',
];

const SYNC_LOCATIONS = ['India', 'Remote'];

// SerpAPI jobs are valid for 24 hours — after that they're considered stale
const JOB_TTL_HOURS = 24;

interface SerpApiJob {
  job_id:      string;
  title:       string;
  company_name:string;
  location:    string;
  description: string;
  related_links?: { link: string; text: string }[];
  share_link?:  string;
  detected_extensions?: {
    posted_at?:    string;
    salary?:       string;
    schedule_type?: string;
  };
  job_highlights?: Array<{
    title:    string;
    items:    string[];
  }>;
}

@Injectable()
export class JobsSyncService {
  private readonly logger = new Logger(JobsSyncService.name);
  private readonly serpApiKey: string;
  private isSyncing = false;   // guard against overlapping runs

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.serpApiKey = this.config.get<string>('SERPAPI_KEY') || '';
  }

  // ── Cron: runs every 30 minutes ──────────────────────────────────────────
  // CronExpression.EVERY_30_MINUTES = '*/30 * * * *'
  // On first deploy, also runs immediately via onModuleInit below.

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledSync(): Promise<void> {
    await this.syncAllJobs();
  }

  // ── Manual trigger: runs once on app startup ──────────────────────────────
  // Ensures jobs are available immediately on first deploy without
  // waiting up to 30 minutes for the first cron tick.

  async onModuleInit(): Promise<void> {
    this.logger.log('JobsSyncService initialized — triggering initial sync');
    // Slight delay to let DB connections stabilize
    setTimeout(() => void this.syncAllJobs(), 5_000);
  }

  // ── Core sync orchestrator ────────────────────────────────────────────────

  async syncAllJobs(): Promise<{ synced: number; skipped: number; errors: number }> {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress — skipping this tick');
      return { synced: 0, skipped: 0, errors: 0 };
    }

    if (!this.serpApiKey) {
      this.logger.warn('SERPAPI_KEY not set — skipping sync');
      return { synced: 0, skipped: 0, errors: 0 };
    }

    this.isSyncing = true;
    const batchId  = `sync_${Date.now()}`;
    let totalSynced  = 0;
    let totalSkipped = 0;
    let totalErrors  = 0;

    this.logger.log(`Starting sync batch: ${batchId}`);

    try {
      // ── Step 1: Fetch from SerpAPI across all query/location combos ────────
      // Run in batches of 3 to avoid hammering the API
      const allJobs: SerpApiJob[] = [];
      const pairs = SYNC_QUERIES.flatMap(q =>
        SYNC_LOCATIONS.map(l => ({ query: q, location: l }))
      );

      for (let i = 0; i < pairs.length; i += 3) {
        const batch = pairs.slice(i, i + 3);

        const results = await Promise.allSettled(
          batch.map(({ query, location }) =>
            this.fetchFromSerpApi(query, location)
          )
        );

        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            allJobs.push(...result.value);
            this.logger.log(
              `Fetched ${result.value.length} jobs for "${batch[idx].query}" in ${batch[idx].location}`
            );
          } else {
            totalErrors++;
            this.logger.error(
              `Failed to fetch "${batch[idx].query}": ${result.reason?.message}`
            );
          }
        });

        // Small delay between batches — be a good API citizen
        if (i + 3 < pairs.length) {
          await this.sleep(500);
        }
      }

      this.logger.log(`Total raw jobs fetched: ${allJobs.length}`);

      // ── Step 2: Deduplicate by external_id ────────────────────────────────
      const seen    = new Set<string>();
      const unique  = allJobs.filter(j => {
        if (!j.job_id || seen.has(j.job_id)) return false;
        seen.add(j.job_id);
        return true;
      });

      this.logger.log(`Unique jobs after dedup: ${unique.length}`);

      // ── Step 3: Upsert into DB ────────────────────────────────────────────
      const expiresAt = new Date(Date.now() + JOB_TTL_HOURS * 60 * 60 * 1000);

      for (const job of unique) {
        try {
          await this.upsertJob(job, batchId, expiresAt);
          totalSynced++;
        } catch (err) {
          totalErrors++;
          this.logger.error(`Failed to upsert job ${job.job_id}: ${err.message}`);
        }
      }

      // ── Step 4: Expire stale jobs ──────────────────────────────────────────
      // Delete SerpAPI jobs not refreshed in this batch that are past TTL
      const { rowCount } = await this.db.query(
        `DELETE FROM jobs
         WHERE source = 'serpapi'
           AND expires_at < NOW()`,
        []
      );

      this.logger.log(
        `Sync complete — synced: ${totalSynced}, skipped: ${totalSkipped}, ` +
        `errors: ${totalErrors}, expired: ${rowCount ?? 0}`
      );

    } finally {
      this.isSyncing = false;
    }

    return { synced: totalSynced, skipped: totalSkipped, errors: totalErrors };
  }

  // ── Upsert a single SerpAPI job into the DB ───────────────────────────────
  // Uses INSERT ... ON CONFLICT (external_id) DO UPDATE so re-running
  // the sync never creates duplicates — it just refreshes existing rows.

  private async upsertJob(
    job: SerpApiJob,
    batchId: string,
    expiresAt: Date,
  ): Promise<void> {
    const applyUrl   = job.related_links?.[0]?.link ?? job.share_link ?? null;
    const workMode   = this.inferWorkMode(job);
    const empType    = this.inferEmploymentType(job);
    const skills     = this.extractSkills(job);
    const { min: salaryMin, max: salaryMax } = this.parseSalary(
      job.detected_extensions?.salary
    );

    await this.db.query(
      `INSERT INTO jobs (
        external_id, source, title, company, location,
        description, work_mode, employment_type,
        salary_min, salary_max, salary_currency,
        required_skills, apply_url,
        status, recruiter_id, expires_at, sync_batch,
        created_at, updated_at
      ) VALUES (
        $1,  $2,  $3,  $4,  $5,
        $6,  $7,  $8,
        $9,  $10, $11,
        $12, $13,
        'active',
        (SELECT id FROM users WHERE role = 'recruiter' LIMIT 1),
        $14, $15,
        NOW(), NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        title          = EXCLUDED.title,
        company        = EXCLUDED.company,
        location       = EXCLUDED.location,
        description    = EXCLUDED.description,
        work_mode      = EXCLUDED.work_mode,
        employment_type= EXCLUDED.employment_type,
        salary_min     = EXCLUDED.salary_min,
        salary_max     = EXCLUDED.salary_max,
        required_skills= EXCLUDED.required_skills,
        apply_url      = EXCLUDED.apply_url,
        expires_at     = EXCLUDED.expires_at,
        sync_batch     = EXCLUDED.sync_batch,
        status         = 'active',
        updated_at     = NOW()`,
      [
        job.job_id,
        'serpapi',
        job.title,
        job.company_name,
        job.location,
        (job.description || '').slice(0, 5000),  // guard against huge descriptions
        workMode,
        empType,
        salaryMin,
        salaryMax,
        'INR',
        skills,
        applyUrl,
        expiresAt,
        batchId,
      ]
    );
  }

  // ── SerpAPI HTTP call ─────────────────────────────────────────────────────

  private async fetchFromSerpApi(
    query: string,
    location: string,
  ): Promise<SerpApiJob[]> {
    const { data } = await firstValueFrom(
      this.httpService.get('https://serpapi.com/search', {
        params: {
          engine:  'google_jobs',
          q:       query,
          location,
          hl:      'en',
          gl:      'in',
          api_key: this.serpApiKey,
        },
        timeout: 15_000,
      })
    );

    return data.jobs_results || [];
  }

  // ── Parsers ───────────────────────────────────────────────────────────────

  private inferWorkMode(job: SerpApiJob): string {
    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    if (text.includes('remote'))                             return 'remote';
    if (text.includes('hybrid'))                             return 'hybrid';
    if (text.includes('on-site') || text.includes('onsite')) return 'onsite';
    return 'hybrid';
  }

  private inferEmploymentType(job: SerpApiJob): string {
    const s = (job.detected_extensions?.schedule_type || '').toLowerCase();
    if (s.includes('contract'))  return 'contract';
    if (s.includes('part'))      return 'part_time';
    if (s.includes('intern'))    return 'internship';
    return 'full_time';
  }

  private extractSkills(job: SerpApiJob): string[] {
    // SerpAPI sometimes surfaces qualifications in job_highlights
    const quals = job.job_highlights?.find(
      h => h.title?.toLowerCase().includes('qualif')
    );
    if (!quals) return [];

    const KNOWN_SKILLS = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++',
      'react', 'next.js', 'vue', 'angular', 'node.js', 'nestjs', 'express',
      'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
      'graphql', 'rest', 'grpc', 'kafka', 'rabbitmq',
      'git', 'ci/cd', 'linux', 'sql',
    ];

    const text = quals.items.join(' ').toLowerCase();
    return KNOWN_SKILLS.filter(skill => text.includes(skill));
  }

  private parseSalary(salary?: string): { min: number | null; max: number | null } {
    if (!salary) return { min: null, max: null };
    const nums = salary.match(/[\d,]+/g);
    if (!nums?.length) return { min: null, max: null };
    const values = nums.map(n => parseInt(n.replace(/,/g, ''), 10));
    return {
      min: values[0] ?? null,
      max: values[1] ?? null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}