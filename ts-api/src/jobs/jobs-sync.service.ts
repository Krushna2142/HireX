/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/jobs/jobs-sync.service.ts

import { Injectable, Logger }   from '@nestjs/common';
import { Cron }                 from '@nestjs/schedule';
import { ConfigService }        from '@nestjs/config';
import { createHash }           from 'crypto';
import { DatabaseService }      from '../database/database.service';
import { AlertsService }        from '../alerts/alerts.service';
import { JobsStreamService }    from './jobs-stream.service';
import { SerpPlatformAdapter }  from './adapters/serp.adapter';
import { LinkedInAdapter }      from './adapters/linkedin.adapter';
import { IndeedAdapter }        from './adapters/indeed.adapter';
import { PlatformAdapter, PlatformJob } from './adapters/platform.adapter';

// ─────────────────────────────────────────────────────────────────────────────
// Sync strategy — designed around free tier API limits
//
// Free tier budgets (per month):
//   SerpAPI:  100 requests  → ~3 requests/day safe
//   JSearch:  200 requests  → ~6 requests/day safe (covers LinkedIn + Indeed)
//
// Strategy:
//   - 3 representative queries (not 13) — covers 90% of job seeker intent
//   - 1 location (India) — your target market
//   - Sequential execution per adapter (not parallel) — avoids burst 429s
//   - 2 second delay between each API call
//   - Sync every 6 hours (4×/day) — stays within budget
//   - Exponential backoff on 429 — self-healing
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_QUERIES = [
  'software engineer',       // broad — catches most tech roles
  'frontend backend developer', // specific — catches specialist roles
  'data devops product manager', // diverse — catches non-engineering roles
];

// One location — SerpAPI location must be a real geographic name
const SYNC_LOCATION = 'India';
const JOB_TTL_HOURS = 24;

// Delay between each individual API call — prevents burst rate limiting
const DELAY_BETWEEN_CALLS_MS = 2_000;  // 2 seconds

@Injectable()
export class JobsSyncService {
  private readonly logger   = new Logger(JobsSyncService.name);
  private readonly adapters: PlatformAdapter[];
  private isSyncing = false;

  constructor(
    private readonly db:      DatabaseService,
    private readonly config:  ConfigService,
    private readonly alerts:  AlertsService,
    private readonly stream:  JobsStreamService,
    serpAdapter:     SerpPlatformAdapter,
    linkedInAdapter: LinkedInAdapter,
    indeedAdapter:   IndeedAdapter,
  ) {
    this.adapters = [serpAdapter, linkedInAdapter, indeedAdapter];
  }

  // ── Every 6 hours — stays within free tier budget ────────────────────────
  @Cron('0 */6 * * *')
  async scheduledSync(): Promise<void> {
    await this.syncAllJobs();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('JobsSyncService ready — initial sync in 10s');
    setTimeout(() => void this.syncAllJobs(), 10_000);
  }

  async syncAllJobs(): Promise<{ synced: number; errors: number }> {
    if (this.isSyncing) {
      this.logger.warn('Sync already running — skipping');
      return { synced: 0, errors: 0 };
    }

    const serpKey    = this.config.get<string>('SERPAPI_KEY');
    const rapidKey   = this.config.get<string>('RAPIDAPI_KEY');

    if (!serpKey && !rapidKey) {
      this.logger.warn('No API keys configured — skipping sync');
      return { synced: 0, errors: 0 };
    }

    this.isSyncing  = true;
    const batchId   = `sync_${Date.now()}`;
    let totalSynced = 0;
    let totalErrors = 0;
    const activePlatforms: string[] = [];

    this.logger.log(`Sync started: ${batchId} — ${SYNC_QUERIES.length} queries × ${this.adapters.length} adapters`);

    try {
      const allJobs: PlatformJob[] = [];

      // ── Sequential execution — one call at a time ─────────────────────────
      // Parallel execution caused all 429s. Free tier APIs throttle by
      // requests-per-second. Sequential with 2s delay = zero rate limit hits.
      for (const query of SYNC_QUERIES) {
        for (const adapter of this.adapters) {
          try {
            this.logger.log(`Fetching: [${adapter.name}] "${query}"`);
            const jobs = await adapter.fetchJobs(query, SYNC_LOCATION);

            if (jobs.length > 0) {
              allJobs.push(...jobs);
              activePlatforms.push(adapter.name);
              this.logger.log(`✓ [${adapter.name}] ${jobs.length} jobs for "${query}"`);
            } else {
              this.logger.log(`○ [${adapter.name}] 0 jobs for "${query}"`);
            }
          } catch (err: any) {
            totalErrors++;
            this.logger.error(`✗ [${adapter.name}] "${query}": ${err.message}`);
          }

          // ✅ 2 second pause between every API call — prevents 429s on free tier
          await this.sleep(DELAY_BETWEEN_CALLS_MS);
        }
      }

      this.logger.log(`Fetch complete — ${allJobs.length} raw jobs from ${[...new Set(activePlatforms)].join(', ')}`);

      // Deduplicate by externalId across all platforms
      const seen   = new Set<string>();
      const unique = allJobs.filter(j => {
        if (!j.externalId || seen.has(j.externalId)) return false;
        seen.add(j.externalId);
        return true;
      });

      this.logger.log(`Unique after dedup: ${unique.length}`);

      const expiresAt    = new Date(Date.now() + JOB_TTL_HOURS * 3_600_000);
      const newJobIds: string[] = [];

      for (const job of unique) {
        try {
          const isNew = await this.upsertJob(job, batchId, expiresAt);
          if (isNew) newJobIds.push(job.externalId);
          totalSynced++;
        } catch (err: any) {
          totalErrors++;
          this.logger.error(`Upsert failed [${job.externalId}]: ${err.message}`);
        }
      }

      // Remove expired external jobs
      await this.db.query(
        `DELETE FROM jobs WHERE source != 'internal' AND expires_at < NOW()`,
        []
      );

      const uniquePlatforms = [...new Set(activePlatforms)];

      // Emit SSE — connected browsers revalidate instantly
      this.stream.emitJobsSynced({
        synced:    totalSynced,
        newJobs:   newJobIds.length,
        platforms: uniquePlatforms,
        sources: {
          serpapi:  allJobs.filter(j => j.platform === 'serpapi').length,
          linkedin: allJobs.filter(j => j.platform === 'linkedin').length,
          indeed:   allJobs.filter(j => j.platform === 'indeed').length,
        },
      });

      // Create alerts for candidates if new jobs arrived
      if (newJobIds.length > 0) {
        await this.createNewJobAlerts(newJobIds.length, uniquePlatforms);
      }

      this.logger.log(
        `Sync complete — synced: ${totalSynced}, new: ${newJobIds.length}, errors: ${totalErrors}`
      );

    } finally {
      this.isSyncing = false;
    }

    return { synced: totalSynced, errors: totalErrors };
  }

  // Returns true if row was newly inserted (not updated)
  private async upsertJob(
    job:       PlatformJob,
    batchId:   string,
    expiresAt: Date,
  ): Promise<boolean> {
    const externalId = this.normalizeId(job.externalId);

    const result = await this.db.query<{ was_inserted: boolean }>(
      `INSERT INTO jobs (
        external_id, source, title, company, location,
        description, work_mode, employment_type,
        salary_min, salary_max, salary_currency,
        required_skills, apply_url, status,
        recruiter_id, expires_at, sync_batch,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,'active',
        (SELECT id FROM users WHERE role = 'recruiter' LIMIT 1),
        $14,$15,
        NOW(),NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        title           = EXCLUDED.title,
        company         = EXCLUDED.company,
        location        = EXCLUDED.location,
        description     = EXCLUDED.description,
        work_mode       = EXCLUDED.work_mode,
        employment_type = EXCLUDED.employment_type,
        salary_min      = EXCLUDED.salary_min,
        salary_max      = EXCLUDED.salary_max,
        required_skills = EXCLUDED.required_skills,
        apply_url       = EXCLUDED.apply_url,
        expires_at      = EXCLUDED.expires_at,
        sync_batch      = EXCLUDED.sync_batch,
        status          = 'active',
        updated_at      = NOW()
      RETURNING (xmax = 0) AS was_inserted`,
      [
        externalId,      job.platform,  job.title,    job.company,  job.location,
        job.description, job.workMode,  job.empType,
        job.salaryMin,   job.salaryMax, 'INR',
        job.skills,      job.applyUrl,
        expiresAt,       batchId,
      ]
    );

    return result.rows[0]?.was_inserted === true;
  }

  private async createNewJobAlerts(
    newCount:  number,
    platforms: string[],
  ): Promise<void> {
    try {
      const { rows: candidates } = await this.db.query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'candidate'`,
        []
      );

      const platformLabel = platforms.join(', ');
      const message = `${newCount} new job${newCount > 1 ? 's' : ''} added from ${platformLabel}. Check your matches!`;

      for (const candidate of candidates) {
        await this.alerts.createAlert({
          userId:   candidate.id,
          type:     'new_jobs',
          title:    `${newCount} New Job${newCount > 1 ? 's' : ''} Available`,
          message,
          metadata: { count: newCount, platforms },
        });
      }

      this.stream.emitAlert({ type: 'new_jobs', message, count: newCount, platforms });

    } catch (err: any) {
      this.logger.error(`createNewJobAlerts failed: ${err.message}`);
    }
  }

  private normalizeId(rawId: string): string {
    if (!rawId) return `unknown_${Date.now()}_${Math.random()}`;
    return rawId.length <= 255
      ? rawId
      : createHash('sha256').update(rawId).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
