import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';

const STAGE_TO_CODE: Record<string, number> = {
  APPLIED: 100,
  UNDER_REVIEW: 110,
  SHORTLISTED: 120,
  INTERVIEW_SCHEDULED: 130,
  INTERVIEW_IN_PROGRESS: 140,
  INTERVIEW_PASSED: 150,
  INTERVIEW_FAILED: 160,
  FINAL_REVIEW: 170,
  OFFERED: 180,
  HIRED: 190,
  REJECTED: 900,
  ON_HOLD: 910,
  WITHDRAWN: 920,
};

export type StageKey = keyof typeof STAGE_TO_CODE;

@Injectable()
export class RecruiterInterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly db: DatabaseService,
  ) {}

  async initInterview(applicationId: string, recruiterId: string) {
    const { rows } = await this.db.query<any>(
      `SELECT a.id, a.job_id, a.candidate_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId],
    );
    if (!rows.length) throw new NotFoundException('Application not found');

    const app = rows[0];

    await this.db.query(
      `INSERT INTO recruiter_interviews (application_id, job_id, candidate_id, recruiter_id, current_stage, status_code)
       VALUES ($1, $2, $3, $4, 'APPLIED', 100)
       ON CONFLICT (application_id) DO NOTHING`,
      [app.id, app.job_id, app.candidate_id, recruiterId],
    );

    const detail = await this.db.query(
      `SELECT * FROM recruiter_interviews WHERE application_id = $1`,
      [applicationId],
    );

    return detail.rows[0];
  }

  async scheduleRound(
    interviewId: string,
    recruiterId: string,
    payload: { roundType: string; scheduledAt: string; durationMins?: number; mode?: string; interviewerId?: string },
  ) {
    const interview = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1 AND recruiter_id = $2`,
      [interviewId, recruiterId],
    );
    if (!interview.rows.length) throw new NotFoundException('Interview not found');

    const n = await this.db.query<{ next_round: number }>(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round
       FROM recruiter_interview_rounds
       WHERE interview_id = $1`,
      [interviewId],
    );
    const roundNumber = n.rows[0].next_round;

    const roomId = `jc-${interviewId.slice(0, 8)}-r${roundNumber}`;
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interviews/room/${roomId}`;

    const { rows } = await this.db.query(
      `INSERT INTO recruiter_interview_rounds
       (interview_id, round_number, round_type, scheduled_at, duration_mins, mode, interviewer_id, meeting_provider, meeting_room_id, meeting_join_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'internal',$8,$9)
       RETURNING *`,
      [
        interviewId,
        roundNumber,
        payload.roundType,
        payload.scheduledAt,
        payload.durationMins ?? 45,
        payload.mode ?? 'video',
        payload.interviewerId ?? null,
        roomId,
        joinUrl,
      ],
    );

    await this.updateStage(interviewId, recruiterId, 'INTERVIEW_SCHEDULED', true);
    return rows[0];
  }

  async updateStage(interviewId: string, actorUserId: string, stage: StageKey, skipAuth = false) {
    const code = STAGE_TO_CODE[stage];
    if (!code) throw new NotFoundException('Invalid stage');

    const interview = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!interview.rows.length) throw new NotFoundException('Interview not found');

    const current = interview.rows[0];
    if (!skipAuth && current.recruiter_id !== actorUserId) {
      throw new ForbiddenException('Not allowed');
    }

    const finalStatus =
      stage === 'REJECTED' ? 'rejected'
      : stage === 'HIRED' ? 'selected'
      : stage === 'SHORTLISTED' ? 'shortlisted'
      : stage === 'ON_HOLD' ? 'on_hold'
      : 'in_progress';

    const { rows } = await this.db.query(
      `UPDATE recruiter_interviews
       SET current_stage = $1, status_code = $2, final_status = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [stage, code, finalStatus, interviewId],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, from_stage, to_stage, metadata)
       VALUES ($1, $2, 'STATUS_CHANGED', $3, $4, $5::jsonb)`,
      [interviewId, actorUserId, current.current_stage, stage, JSON.stringify({ statusCode: code })],
    );

    if (stage === 'REJECTED') {
      await this.garbageRejectedResume(current.candidate_id, current.application_id);
    }

    return rows[0];
  }

  async submitRoundResult(roundId: string, recruiterId: string, payload: { result: string; score?: number; feedback?: string }) {
    const check = await this.db.query<any>(
      `SELECT r.*, i.recruiter_id, i.id AS interview_id
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       WHERE r.id = $1`,
      [roundId],
    );
    if (!check.rows.length) throw new NotFoundException('Round not found');
    if (check.rows[0].recruiter_id !== recruiterId) throw new ForbiddenException('Not allowed');

    const { rows } = await this.db.query(
      `UPDATE recruiter_interview_rounds
       SET result = $1, score = $2, feedback = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payload.result, payload.score ?? null, payload.feedback ?? null, roundId],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, metadata)
       VALUES ($1, $2, 'ROUND_COMPLETED', $3::jsonb)`,
      [check.rows[0].interview_id, recruiterId, JSON.stringify({ roundId, result: payload.result })],
    );

    return rows[0];
  }

  async getDashboard(recruiterId: string, jobId?: string) {
    const params: any[] = [recruiterId];
    let where = `WHERE recruiter_id = $1`;
    if (jobId) {
      params.push(jobId);
      where += ` AND job_id = $2`;
    }

    const { rows } = await this.db.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE current_stage='SHORTLISTED')::int as shortlisted,
         COUNT(*) FILTER (WHERE current_stage='REJECTED')::int as rejected,
         COUNT(*) FILTER (WHERE current_stage='INTERVIEW_SCHEDULED')::int as scheduled,
         COUNT(*) FILTER (WHERE current_stage='HIRED')::int as hired
       FROM recruiter_interviews
       ${where}`,
      params,
    );

    return rows[0];
  }

  async listInterviews(userId: string, role: string, opts: { statusCode?: number; limit?: number }) {
    const limit = Math.min(opts.limit ?? 20, 100);
    const params: any[] = [limit];
    let where = '';

    if (role === 'recruiter') {
      params.unshift(userId);
      where = `WHERE i.recruiter_id = $1`;
      if (opts.statusCode) {
        params.push(opts.statusCode);
        where += ` AND i.status_code = $${params.length}`;
      }
    } else {
      params.unshift(userId);
      where = `WHERE i.candidate_id = $1`;
      if (opts.statusCode) {
        params.push(opts.statusCode);
        where += ` AND i.status_code = $${params.length}`;
      }
    }

    const q = role === 'recruiter'
      ? `SELECT i.*, u.full_name as candidate_name, j.title as job_title
         FROM recruiter_interviews i
         LEFT JOIN users u ON u.id = i.candidate_id
         LEFT JOIN jobs j ON j.id = i.job_id
         ${where}
         ORDER BY i.updated_at DESC
         LIMIT $2`
      : `SELECT i.*, j.title as job_title, j.company
         FROM recruiter_interviews i
         LEFT JOIN jobs j ON j.id = i.job_id
         ${where}
         ORDER BY i.updated_at DESC
         LIMIT $2`;

    const { rows } = await this.db.query(q, params);
    return rows;
  }

  async getInterview(interviewId: string, userId: string, role: string) {
    const { rows } = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!rows.length) throw new NotFoundException('Interview not found');

    const i = rows[0];
    if (role === 'recruiter' && i.recruiter_id !== userId) throw new ForbiddenException('Not allowed');
    if (role !== 'recruiter' && i.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const rounds = await this.db.query(
      `SELECT * FROM recruiter_interview_rounds WHERE interview_id = $1 ORDER BY round_number`,
      [interviewId],
    );
    const events = await this.db.query(
      `SELECT * FROM recruiter_interview_events WHERE interview_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [interviewId],
    );

    return { interview: i, rounds: rounds.rows, events: events.rows };
  }

  private async garbageRejectedResume(candidateId: string, applicationId: string) {
    const app = await this.db.query<{ resume_id: string | null }>(
      `SELECT resume_id FROM applications WHERE id = $1`,
      [applicationId],
    );
    if (!app.rows.length || !app.rows[0].resume_id) return;

    const resumeId = app.rows[0].resume_id;

    await this.db.query(
      `UPDATE resumes
       SET status='garbaged',
           garbaged_at=NOW(),
           garbage_reason='rejected',
           content=NULL,
           file_bytes=NULL
       WHERE id = $1 AND user_id = $2`,
      [resumeId, candidateId],
    );

    await this.db.query(
      `UPDATE candidate_profiles
       SET active_resume_id = NULL
       WHERE user_id = $1 AND active_resume_id = $2`,
      [candidateId, resumeId],
    );
  }
}