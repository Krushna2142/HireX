import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';
import { AlertsService } from '../alerts/alerts.service';

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

const RESULT_TO_STAGE: Partial<Record<string, StageKey>> = {
  pass: 'INTERVIEW_PASSED',
  fail: 'INTERVIEW_FAILED',
  no_show: 'ON_HOLD',
  reschedule: 'INTERVIEW_SCHEDULED',
};

type ApplicationSeedRow = {
  id: string;
  job_id: string;
  candidate_id: string;
};

type RecruiterInterviewRow = {
  id: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  recruiter_id: string;
  current_stage: string;
};

type RecruiterInterviewRoundRow = {
  id: string;
  interview_id: string;
  round_number: number;
  recruiter_id?: string;
};

@Injectable()
export class RecruiterInterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly db: DatabaseService,
    private readonly alerts: AlertsService,
  ) {}

  async initInterview(applicationId: string, recruiterId: string) {
    const { rows } = await this.db.query<ApplicationSeedRow>(
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
    payload: {
      roundType: string;
      scheduledAt: string;
      durationMins?: number;
      mode?: string;
      interviewerId?: string;
    },
  ) {
    const interview = await this.db.query<RecruiterInterviewRow>(
      `SELECT * FROM recruiter_interviews WHERE id = $1 AND recruiter_id = $2`,
      [interviewId, recruiterId],
    );
    if (!interview.rows.length)
      throw new NotFoundException('Interview not found');

    const n = await this.db.query<{ next_round: number }>(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round
       FROM recruiter_interview_rounds
       WHERE interview_id = $1`,
      [interviewId],
    );
    const roundNumber = n.rows[0].next_round;

    const roomId = `jc-${interviewId}-r${roundNumber}`;
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interviews/room/${roomId}`;

    const { rows } = await this.db.query<RecruiterInterviewRoundRow>(
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

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, metadata)
       VALUES ($1, $2, 'round_scheduled', $3::jsonb)`,
      [
        interviewId,
        recruiterId,
        JSON.stringify({
          roundId: rows[0].id,
          round_number: roundNumber,
          roundType: payload.roundType,
          scheduledAt: payload.scheduledAt,
          mode: payload.mode ?? 'video',
        }),
      ],
    );

    await this.updateStage(
      interviewId,
      recruiterId,
      'INTERVIEW_SCHEDULED',
      true,
    );

    const [jobRow, candidateRow] = await Promise.all([
      this.db.query<{ title: string }>(`SELECT title FROM jobs WHERE id = $1`, [
        interview.rows[0].job_id,
      ]),
      this.db.query<{ full_name: string }>(
        `SELECT full_name FROM users WHERE id = $1`,
        [interview.rows[0].candidate_id],
      ),
    ]);

    const jobTitle = jobRow.rows[0]?.title ?? 'your application';
    const candidateName = candidateRow.rows[0]?.full_name ?? 'candidate';
    const when = new Date(payload.scheduledAt).toLocaleString();

    await this.alerts.createBulkAlerts([
      {
        userId: interview.rows[0].candidate_id,
        type: 'interview_scheduled',
        title: 'Interview round scheduled',
        message: `${payload.roundType} round scheduled for ${jobTitle} on ${when}.`,
        metadata: {
          interviewId,
          roundId: rows[0].id,
          roundNumber,
          joinUrl,
          scheduledAt: payload.scheduledAt,
        },
      },
      {
        userId: recruiterId,
        type: 'interview_scheduled',
        title: 'Interview round scheduled',
        message: `${candidateName} is scheduled for round ${roundNumber} (${payload.roundType}) on ${when}.`,
        metadata: {
          interviewId,
          roundId: rows[0].id,
          roundNumber,
          joinUrl,
          scheduledAt: payload.scheduledAt,
        },
      },
    ]);

    return rows[0];
  }

  async updateStage(
    interviewId: string,
    actorUserId: string,
    stage: StageKey,
    skipAuth = false,
  ) {
    const code = STAGE_TO_CODE[stage];
    if (!code) throw new NotFoundException('Invalid stage');

    const interview = await this.db.query<RecruiterInterviewRow>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!interview.rows.length)
      throw new NotFoundException('Interview not found');

    const current = interview.rows[0];
    if (!skipAuth && current.recruiter_id !== actorUserId) {
      throw new ForbiddenException('Not allowed');
    }

    const finalStatus =
      stage === 'REJECTED'
        ? 'rejected'
        : stage === 'HIRED'
          ? 'selected'
          : stage === 'SHORTLISTED'
            ? 'shortlisted'
            : stage === 'ON_HOLD'
              ? 'on_hold'
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
      [
        interviewId,
        actorUserId,
        current.current_stage,
        stage,
        JSON.stringify({ statusCode: code }),
      ],
    );

    const { rows: jobRows } = await this.db.query<{ title: string }>(
      `SELECT title FROM jobs WHERE id = $1`,
      [current.job_id],
    );
    const jobTitle = jobRows[0]?.title ?? 'your application';
    const stageMessage = this.stageMessage(stage, jobTitle);

    await this.alerts.createBulkAlerts([
      {
        userId: current.candidate_id,
        type: 'interview_stage',
        title: `Interview status: ${stage}`,
        message: stageMessage.candidate,
        metadata: { interviewId, stage, statusCode: code },
      },
      {
        userId: current.recruiter_id,
        type: 'interview_stage',
        title: `Interview status: ${stage}`,
        message: stageMessage.recruiter,
        metadata: { interviewId, stage, statusCode: code },
      },
    ]);

    if (stage === 'REJECTED') {
      await this.garbageRejectedResume(
        current.candidate_id,
        current.application_id,
      );
    }

    return rows[0];
  }

  async submitRoundResult(
    roundId: string,
    recruiterId: string,
    payload: { result: string; score?: number; feedback?: string },
  ) {
    const check = await this.db.query<RecruiterInterviewRoundRow>(
      `SELECT r.*, i.recruiter_id, i.id AS interview_id
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       WHERE r.id = $1`,
      [roundId],
    );
    if (!check.rows.length) throw new NotFoundException('Round not found');
    if (check.rows[0].recruiter_id !== recruiterId)
      throw new ForbiddenException('Not allowed');

    const { rows } = await this.db.query<RecruiterInterviewRoundRow>(
      `UPDATE recruiter_interview_rounds
       SET result = $1, score = $2, feedback = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        payload.result,
        payload.score ?? null,
        payload.feedback ?? null,
        roundId,
      ],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, metadata)
       VALUES ($1, $2, 'ROUND_COMPLETED', $3::jsonb)`,
      [
        check.rows[0].interview_id,
        recruiterId,
        JSON.stringify({ roundId, result: payload.result }),
      ],
    );

    const { rows: interviewMeta } = await this.db.query<{
      candidate_id: string;
      recruiter_id: string;
      job_title: string;
    }>(
      `SELECT i.candidate_id, i.recruiter_id, j.title AS job_title
       FROM recruiter_interviews i
       JOIN jobs j ON j.id = i.job_id
       WHERE i.id = $1`,
      [check.rows[0].interview_id],
    );

    const meta = interviewMeta[0];
    const title = meta?.job_title ?? 'your interview';
    const nextStage = RESULT_TO_STAGE[payload.result];
    if (nextStage) {
      await this.updateStage(
        check.rows[0].interview_id,
        recruiterId,
        nextStage,
        true,
      );
    }

    const resultLabel = payload.result.replaceAll('_', ' ');
    const roundNumber = rows[0]?.round_number ?? check.rows[0].round_number;

    if (meta) {
      await this.alerts.createBulkAlerts([
        {
          userId: meta.candidate_id,
          type: 'interview_round_result',
          title: 'Interview round updated',
          message: `Round ${roundNumber} for ${title} is now marked ${resultLabel}.`,
          metadata: {
            roundId,
            roundNumber,
            interviewId: check.rows[0].interview_id,
            result: payload.result,
          },
        },
        {
          userId: meta.recruiter_id,
          type: 'interview_round_result',
          title: 'Interview round updated',
          message: `Round ${roundNumber} for ${title} is now marked ${resultLabel}.`,
          metadata: {
            roundId,
            roundNumber,
            interviewId: check.rows[0].interview_id,
            result: payload.result,
          },
        },
      ]);
    }

    return rows[0];
  }

  async getDashboard(recruiterId: string, jobId?: string) {
    const params: Array<string | number> = [recruiterId];
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

  async listInterviews(
    userId: string,
    role: string,
    opts: { statusCode?: number; limit?: number },
  ) {
    const limit = Math.min(opts.limit ?? 20, 100);
    const params: Array<string | number> = [limit];
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

    const q =
      role === 'recruiter'
        ? `SELECT i.*, u.full_name as candidate_name, u.email as candidate_email, j.title as job_title, j.company
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
    const { rows } = await this.db.query<RecruiterInterviewRow>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!rows.length) throw new NotFoundException('Interview not found');

    const i = rows[0];
    if (role === 'recruiter' && i.recruiter_id !== userId)
      throw new ForbiddenException('Not allowed');
    if (role !== 'recruiter' && i.candidate_id !== userId)
      throw new ForbiddenException('Not allowed');

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

  private async garbageRejectedResume(
    candidateId: string,
    applicationId: string,
  ) {
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

  private stageMessage(stage: string, jobTitle: string) {
    const map: Record<string, { candidate: string; recruiter: string }> = {
      SHORTLISTED: {
        candidate: `You have been shortlisted for ${jobTitle}.`,
        recruiter: `Candidate moved to shortlisted for ${jobTitle}.`,
      },
      INTERVIEW_SCHEDULED: {
        candidate: `Your interview for ${jobTitle} has been scheduled.`,
        recruiter: `Interview scheduled for ${jobTitle}.`,
      },
      INTERVIEW_IN_PROGRESS: {
        candidate: `Your interview for ${jobTitle} is now in progress.`,
        recruiter: `Interview is now in progress for ${jobTitle}.`,
      },
      INTERVIEW_PASSED: {
        candidate: `You passed the interview for ${jobTitle}.`,
        recruiter: `Candidate passed the interview for ${jobTitle}.`,
      },
      INTERVIEW_FAILED: {
        candidate: `Your interview for ${jobTitle} has been marked unsuccessful.`,
        recruiter: `Candidate did not clear the interview for ${jobTitle}.`,
      },
      FINAL_REVIEW: {
        candidate: `Your profile for ${jobTitle} is in final review.`,
        recruiter: `Candidate moved to final review for ${jobTitle}.`,
      },
      OFFERED: {
        candidate: `An offer has been moved forward for ${jobTitle}.`,
        recruiter: `Offer stage reached for ${jobTitle}.`,
      },
      HIRED: {
        candidate: `Congratulations, you are hired for ${jobTitle}.`,
        recruiter: `Candidate marked hired for ${jobTitle}.`,
      },
      REJECTED: {
        candidate: `Your application for ${jobTitle} has been closed.`,
        recruiter: `Candidate marked rejected for ${jobTitle}.`,
      },
      ON_HOLD: {
        candidate: `Your application for ${jobTitle} is currently on hold.`,
        recruiter: `Candidate placed on hold for ${jobTitle}.`,
      },
    };

    return (
      map[stage] ?? {
        candidate: `Interview status updated to ${stage} for ${jobTitle}.`,
        recruiter: `Interview status updated to ${stage} for ${jobTitle}.`,
      }
    );
  }
}
