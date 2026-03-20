/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/jobs/jobs-sync.service.ts

import { Injectable, Logger }   from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService }        from '@nestjs/config';
import { createHash }           from 'crypto';
import { DatabaseService }      from '../database/database.service';
import { AlertsService }        from '../alerts/alerts.service';
import { JobsStreamService }    from './jobs-stream.service';
import { SerpPlatformAdapter }  from './adapters/serp.adapter';
import { LinkedInAdapter }      from './adapters/linkedin.adapter';
import { IndeedAdapter }        from './adapters/indeed.adapter';
import { PlatformAdapter, PlatformJob } from './adapters/platform.adapter';

const SYNC_QUERIES = [
  'software engineer',
  'frontend developer',
  'backend developer',
  'full stack developer',
  'data engineer',
  'devops engineer',
  'product manager',
  'machine learning engineer',
  'cloud architect',
  'ui ux designer',
  'remote software engineer',
  'remote frontend developer',
  'remote backend developer',
];

const SYNC_LOCATIONS = ['India'];
const JOB_TTL_HOURS  = 24;

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

  // ── Scheduled sync every 30 minutes ──────────────────────────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledSync(): Promise<void> {
    await this.syncAllJobs();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('JobsSyncService ready — initial sync in 5s');
    setTimeout(() => void this.syncAllJobs(), 5_000);
  }

  // ── Core orchestrator ─────────────────────────────────────────────────────

  async syncAllJobs(): Promise<{ synced: number; errors: number }> {
    if (this.isSyncing) {
      this.logger.warn('Sync already running — skipping tick');
      return { synced: 0, errors: 0 };
    }

    const apiKey = this.config.get<string>('SERPAPI_KEY');
    if (!apiKey) {
      this.logger.warn('SERPAPI_KEY not set — skipping sync');
      return { synced: 0, errors: 0 };
    }

    this.isSyncing  = true;
    const batchId   = `sync_${Date.now()}`;
    let totalSynced = 0;
    let totalErrors = 0;
    const activePlatforms: string[] = [];

    this.logger.log(`Sync batch started: ${batchId}`);

    try {
      const allJobs: PlatformJob[] = [];

      // Fetch all queries × all locations × all adapters in parallel batches
      for (const query of SYNC_QUERIES) {
        for (const location of SYNC_LOCATIONS) {
          const results = await Promise.allSettled(
            this.adapters.map(adapter =>
              adapter.fetchJobs(query, location).then(jobs => {
                if (jobs.length) activePlatforms.push(adapter.name);
                return jobs;
              })
            )
          );

          results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              allJobs.push(...result.value);
              this.logger.log(
                `${this.adapters[idx].name}: ${result.value.length} jobs for "${query}"`
              );
            } else {
              totalErrors++;
              this.logger.error(
                `${this.adapters[idx].name} failed for "${query}": ${(result.reason as Error)?.message}`
              );
            }
          });

          // Small delay between query batches — respect rate limits
          await this.sleep(300);
        }
      }

      this.logger.log(`Total raw jobs fetched: ${allJobs.length}`);

      // Deduplicate across all platforms by externalId
      const seen   = new Set<string>();
      const unique = allJobs.filter(j => {
        if (!j.externalId || seen.has(j.externalId)) return false;
        seen.add(j.externalId);
        return true;
      });

      this.logger.log(`Unique after global dedup: ${unique.length}`);

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

      // Clean up expired jobs from all external platforms
      await this.db.query(
        `DELETE FROM jobs WHERE source != 'internal' AND expires_at < NOW()`,
        []
      );

      const uniquePlatforms = [...new Set(activePlatforms)];

      // ── Emit SSE → connected frontends revalidate instantly ──────────────
      // ✅ newJobs is now in the interface — ts(2353) resolved
      this.stream.emitJobsSynced({
        synced:    totalSynced,
        newJobs:   newJobIds.length,
        platforms: uniquePlatforms,
      });

      // ── Create alerts only for genuinely new jobs ─────────────────────────
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

  // ── Upsert a single job — returns true if it was a NEW insert ────────────
  // Uses PostgreSQL's xmax trick: xmax = 0 on INSERT, > 0 on UPDATE

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
        externalId, job.platform, job.title, job.company, job.location,
        job.description, job.workMode, job.empType,
        job.salaryMin, job.salaryMax, 'INR',
        job.skills, job.applyUrl,
        expiresAt, batchId,
      ]
    );

    return result.rows[0]?.was_inserted === true;
  }

  // ── Alert all candidates when new jobs arrive ─────────────────────────────

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
      const message = newCount === 1
        ? `1 new job just added from ${platformLabel}. Check your matches!`
        : `${newCount} new jobs just added from ${platformLabel}. Check your matches!`;

      // Batch-insert alerts — one per candidate
      for (const candidate of candidates) {
        await this.alerts.createAlert({
          userId:   candidate.id,
          type:     'new_jobs',
          title:    `${newCount} New Job${newCount > 1 ? 's' : ''} Available`,
          message,
          metadata: { count: newCount, platforms },
        });
      }

      // Also push to SSE so alert badge updates without polling
      this.stream.emitAlert({
        type:      'new_jobs',
        message,
        count:     newCount,
        platforms,
      });

    } catch (err: any) {
      this.logger.error(`createNewJobAlerts failed: ${err.message}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * SerpAPI job_ids are base64 blobs that can exceed 400 chars.
   * Hash anything > 255 chars to a stable 64-char SHA-256 hex string.
   */
  private normalizeId(rawId: string): string {
    if (!rawId) return `unknown_${Date.now()}`;
    return rawId.length <= 255
      ? rawId
      : createHash('sha256').update(rawId).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}