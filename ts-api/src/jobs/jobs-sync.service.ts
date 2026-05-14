/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/jobs/jobs-sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { AlertsService } from '../alerts/alerts.service';
import { JobsStreamService } from './jobs-stream.service';
import { SerpPlatformAdapter } from './adapters/serp.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { IndeedAdapter } from './adapters/indeed.adapter';
import { PlatformAdapter, PlatformJob } from './adapters/platform.adapter';

const SYNC_QUERIES = [
  'software engineer',
  'frontend backend developer',
  'data devops product manager',
];

const SYNC_LOCATION = 'India';
const JOB_TTL_HOURS = 24;
const DELAY_BETWEEN_CALLS_MS = 2_000;

@Injectable()
export class JobsSyncService {
  private readonly logger = new Logger(JobsSyncService.name);
  private readonly adapters: PlatformAdapter[];
  private isSyncing = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly alerts: AlertsService,
    private readonly stream: JobsStreamService,
    serpAdapter: SerpPlatformAdapter,
    linkedInAdapter: LinkedInAdapter,
    indeedAdapter: IndeedAdapter,
  ) {
    this.adapters = [serpAdapter, linkedInAdapter, indeedAdapter];
  }

  private syncEnabled(): boolean {
    const value =
      this.config.get<string>('JOBS_SYNC_ENABLED') ??
      process.env.JOBS_SYNC_ENABLED ??
      'true';

    return value !== 'false';
  }

  @Cron('0 */6 * * *')
  async scheduledSync(): Promise<void> {
    if (!this.syncEnabled()) {
      this.logger.warn('JOBS_SYNC_ENABLED=false — scheduled job sync skipped');
      return;
    }

    await this.syncAllJobs();
  }

  async onModuleInit(): Promise<void> {
    if (!this.syncEnabled()) {
      this.logger.warn('JobsSyncService ready — initial sync disabled by JOBS_SYNC_ENABLED=false');
      return;
    }

    this.logger.log('JobsSyncService ready — initial sync in 10s');
    setTimeout(() => void this.syncAllJobs(), 10_000);
  }

  async syncAllJobs(): Promise<{ synced: number; errors: number }> {
    if (!this.syncEnabled()) {
      return { synced: 0, errors: 0 };
    }

    if (this.isSyncing) {
      this.logger.warn('Sync already running — skipping');
      return { synced: 0, errors: 0 };
    }

    const serpKey = this.config.get<string>('SERPAPI_KEY');
    const rapidKey = this.config.get<string>('RAPIDAPI_KEY');

    if (!serpKey && !rapidKey) {
      this.logger.warn('No API keys configured — skipping sync');
      return { synced: 0, errors: 0 };
    }

    this.isSyncing = true;

    const batchId = `sync_${Date.now()}`;
    let totalSynced = 0;
    let totalErrors = 0;
    const activePlatforms: string[] = [];

    this.logger.log(
      `Sync started: ${batchId} — ${SYNC_QUERIES.length} queries × ${this.adapters.length} adapters`,
    );

    try {
      const allJobs: PlatformJob[] = [];

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

          await this.sleep(DELAY_BETWEEN_CALLS_MS);
        }
      }

      this.logger.log(
        `Fetch complete — ${allJobs.length} raw jobs from ${[
          ...new Set(activePlatforms),
        ].join(', ')}`,
      );

      const seen = new Set<string>();
      const unique = allJobs.filter((job) => {
        if (!job.externalId || seen.has(job.externalId)) return false;
        seen.add(job.externalId);
        return true;
      });

      this.logger.log(`Unique after dedup: ${unique.length}`);

      const expiresAt = new Date(Date.now() + JOB_TTL_HOURS * 3_600_000);
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

      await this.db.query(
        `DELETE FROM jobs WHERE source != 'internal' AND expires_at < NOW()`,
        [],
      );

      const uniquePlatforms = [...new Set(activePlatforms)];

      this.stream.emitJobsSynced({
        synced: totalSynced,
        newJobs: newJobIds.length,
        platforms: uniquePlatforms,
        sources: {
          serpapi: allJobs.filter((job) => job.platform === 'serpapi').length,
          linkedin: allJobs.filter((job) => job.platform === 'linkedin').length,
          indeed: allJobs.filter((job) => job.platform === 'indeed').length,
        },
      });

      if (newJobIds.length > 0) {
        await this.createNewJobAlerts(newJobIds.length, uniquePlatforms);
      }

      this.logger.log(
        `Sync complete — synced: ${totalSynced}, new: ${newJobIds.length}, errors: ${totalErrors}`,
      );
    } finally {
      this.isSyncing = false;
    }

    return { synced: totalSynced, errors: totalErrors };
  }

  private async upsertJob(
    job: PlatformJob,
    batchId: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const externalId = this.normalizeId(job.externalId);

    const result = await this.db.query<{ was_inserted: boolean }>(
      `INSERT INTO jobs (
        external_id,
        source,
        title,
        company_name,
        location,
        description,
        work_mode,
        employment_type,
        salary_min,
        salary_max,
        salary_currency,
        required_skills,
        apply_url,
        status,
        recruiter_user_id,
        expires_at,
        sync_batch,
        published_at,
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,'PUBLISHED',
        (
          SELECT id
          FROM users
          WHERE role = 'RECRUITER'
            AND deleted_at IS NULL
          ORDER BY created_at ASC
          LIMIT 1
        ),
        $14,$15,
        COALESCE($16, NOW()),
        NOW(),NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        title           = EXCLUDED.title,
        company_name    = EXCLUDED.company_name,
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
        status          = 'PUBLISHED',
        updated_at      = NOW()
      RETURNING (xmax = 0) AS was_inserted`,
      [
        externalId,
        job.platform,
        job.title,
        job.company,
        job.location,
        job.description,
        job.workMode,
        job.empType,
        job.salaryMin,
        job.salaryMax,
        'INR',
        job.skills,
        job.applyUrl,
        expiresAt,
        batchId,
        job.postedAt ?? new Date(),
      ],
    );

    return result.rows[0]?.was_inserted === true;
  }

  private async createNewJobAlerts(
    newCount: number,
    platforms: string[],
  ): Promise<void> {
    try {
      const { rows: candidates } = await this.db.query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'JOBSEEKER' AND deleted_at IS NULL`,
        [],
      );

      const platformLabel = platforms.join(', ');
      const message = `${newCount} new job${newCount > 1 ? 's' : ''} added from ${platformLabel}. Check your matches!`;

      for (const candidate of candidates) {
        await this.alerts.createAlert({
          userId: candidate.id,
          type: 'new_jobs',
          title: `${newCount} New Job${newCount > 1 ? 's' : ''} Available`,
          message,
          metadata: { count: newCount, platforms },
        });
      }

      this.stream.emitAlert({
        type: 'new_jobs',
        message,
        count: newCount,
        platforms,
      });
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}