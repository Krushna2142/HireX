/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface CreateAlertPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// ── Typed row interfaces ──────────────────────────────────────────────────────

interface AlertRow {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  message:    string;
  metadata:   Record<string, unknown>;
  read:       boolean;
  created_at: Date;
}

interface CountRow {
  count: string;
}

interface CandidateRow {
  user_id: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createAlert(payload: CreateAlertPayload) {
    const { rows } = await this.db.query<AlertRow>(
      `INSERT INTO alerts (user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        payload.userId,
        payload.type,
        payload.title,
        payload.message,
        JSON.stringify(payload.metadata || {}),
      ],
    );

    this.logger.log(`Alert created: ${payload.type} for user ${payload.userId}`);
    return rows[0];
  }

  async createBulkAlerts(payloads: CreateAlertPayload[]) {
    if (payloads.length === 0) return [];

    const values = payloads
      .map((_, i) => `($${i * 5 + 1},$${i * 5 + 2},$${i * 5 + 3},$${i * 5 + 4},$${i * 5 + 5})`)
      .join(', ');

    const params = payloads.flatMap(p => [
      p.userId, p.type, p.title, p.message,
      JSON.stringify(p.metadata || {}),
    ]);

    const { rows } = await this.db.query<AlertRow>(
      `INSERT INTO alerts (user_id, type, title, message, metadata)
       VALUES ${values} RETURNING *`,
      params,
    );

    return rows;
  }

  async notifyMatchingCandidates(job: any) {
    try {
      const { rows: candidates } = await this.db.query<CandidateRow>(
        `SELECT cp.user_id
         FROM candidate_profiles cp
         WHERE cp.is_visible = true
           AND cp.top_skills && $1::text[]
           AND (cp.experience_years IS NULL OR cp.experience_years >= $2)
           AND (cp.experience_years IS NULL OR $3::float IS NULL OR cp.experience_years <= $3)
         LIMIT 500`,
        [
          job.required_skills,
          job.experience_min || 0,
          job.experience_max,
        ],
      );

      if (candidates.length === 0) return;

      const alerts = candidates.map(c => ({
        userId:  c.user_id,
        type:    'job_match',
        title:   `New job match: ${job.title}`,
        message: `${job.company} is hiring for "${job.title}" — matches your skills`,
        metadata: {
          job_id:     job.id,
          company:    job.company,
          location:   job.location,
          work_mode:  job.work_mode,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
        },
      }));

      await this.createBulkAlerts(alerts);
      this.logger.log(`Notified ${candidates.length} candidates for job ${job.id}`);

    } catch (err) {
      this.logger.error(`Failed to notify candidates for job ${job.id}: ${(err as Error).message}`);
    }
  }

  async getUserAlerts(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [alertsResult, countResult] = await Promise.all([
      this.db.query<AlertRow>(
        `SELECT * FROM alerts WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.db.query<CountRow>(
        `SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND read = FALSE`,
        [userId],
      ),
    ]);

    return {
      alerts: alertsResult.rows,
      unread: parseInt(countResult.rows[0].count, 10), // ✅ string → number
      page,
      limit,
    };
  }

  async markRead(userId: string, alertIds?: string[]) {
    if (alertIds?.length) {
      await this.db.query(
        `UPDATE alerts SET read = TRUE
         WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, alertIds],
      );
    } else {
      await this.db.query(
        'UPDATE alerts SET read = TRUE WHERE user_id = $1 AND read = FALSE',
        [userId],
      );
    }
    return { success: true };
  }
}