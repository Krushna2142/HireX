/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type FeedbackPayload = {
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  culture_fit_score?: number;
  strengths?: string;
  improvements?: string;
  notes?: string;
  recommendation: 'HIRE' | 'REJECT' | 'HOLD';
};

type FeedbackRow = {
  id: string;
  interview_id: string;
  round_id: string;
  recruiter_id: string;
  technical_score: number | string;
  communication_score: number | string;
  problem_solving_score: number | string;
  culture_fit_score: number | string;
  overall_score: number | string;
  recommendation: string;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RoundOwnershipRow = {
  round_id: string;
  interview_id: string;
  recruiter_id: string;
  candidate_id: string;
};

type InterviewOwnershipRow = {
  id: string;
  recruiter_id: string;
  candidate_id: string;
};

@Injectable()
export class FeedbackService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS recruiter_interview_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        interview_id UUID NOT NULL REFERENCES recruiter_interviews(id) ON DELETE CASCADE,
        round_id UUID NOT NULL UNIQUE REFERENCES recruiter_interview_rounds(id) ON DELETE CASCADE,
        recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        technical_score NUMERIC(4,2) NOT NULL,
        communication_score NUMERIC(4,2) NOT NULL,
        problem_solving_score NUMERIC(4,2) NOT NULL,
        culture_fit_score NUMERIC(4,2) NOT NULL DEFAULT 3,
        overall_score NUMERIC(5,2) NOT NULL,
        recommendation VARCHAR(16) NOT NULL,
        strengths TEXT,
        improvements TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_rif_interview_created
      ON recruiter_interview_feedback (interview_id, created_at DESC)
    `);
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_rif_recruiter
      ON recruiter_interview_feedback (recruiter_id)
    `);
  }

  async create(roundId: string, recruiterId: string, payload: FeedbackPayload) {
    const scores = this.validatePayload(payload, false);
    const round = await this.getOwnedRound(roundId, recruiterId);

    try {
      const { rows } = await this.db.query<FeedbackRow>(
        `INSERT INTO recruiter_interview_feedback (
          interview_id,
          round_id,
          recruiter_id,
          technical_score,
          communication_score,
          problem_solving_score,
          culture_fit_score,
          overall_score,
          recommendation,
          strengths,
          improvements,
          notes,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        RETURNING *`,
        [
          round.interview_id,
          round.round_id,
          recruiterId,
          scores.technical_score,
          scores.communication_score,
          scores.problem_solving_score,
          scores.culture_fit_score,
          scores.overall_score,
          scores.recommendation,
          scores.strengths ?? null,
          scores.improvements ?? null,
          scores.notes ?? null,
        ],
      );

      return this.normalize(rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Feedback already exists for this round');
      }
      throw error;
    }
  }

  async update(
    feedbackId: string,
    recruiterId: string,
    payload: Partial<FeedbackPayload>,
  ) {
    const existing = await this.db.query<FeedbackRow & RoundOwnershipRow>(
      `SELECT
         f.*,
         i.recruiter_id,
         i.candidate_id,
         r.id AS round_id
       FROM recruiter_interview_feedback f
       JOIN recruiter_interview_rounds r ON r.id = f.round_id
       JOIN recruiter_interviews i ON i.id = f.interview_id
       WHERE f.id = $1`,
      [feedbackId],
    );

    if (!existing.rows.length) {
      throw new NotFoundException('Feedback not found');
    }

    const record = existing.rows[0];
    if (record.recruiter_id !== recruiterId) {
      throw new ForbiddenException('Not allowed to edit this feedback');
    }

    const merged = this.validatePayload(
      {
        technical_score: Number(record.technical_score),
        communication_score: Number(record.communication_score),
        problem_solving_score: Number(record.problem_solving_score),
        culture_fit_score: Number(record.culture_fit_score),
        recommendation: record.recommendation as 'HIRE' | 'REJECT' | 'HOLD',
        strengths: record.strengths ?? undefined,
        improvements: record.improvements ?? undefined,
        notes: record.notes ?? undefined,
        ...payload,
      },
      false,
    );

    const { rows } = await this.db.query<FeedbackRow>(
      `UPDATE recruiter_interview_feedback
       SET technical_score = $1,
           communication_score = $2,
           problem_solving_score = $3,
           culture_fit_score = $4,
           overall_score = $5,
           recommendation = $6,
           strengths = $7,
           improvements = $8,
           notes = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        merged.technical_score,
        merged.communication_score,
        merged.problem_solving_score,
        merged.culture_fit_score,
        merged.overall_score,
        merged.recommendation,
        merged.strengths ?? null,
        merged.improvements ?? null,
        merged.notes ?? null,
        feedbackId,
      ],
    );

    return this.normalize(rows[0]);
  }

  async getByRound(roundId: string, userId: string, role: string) {
    const { rows } = await this.db.query<FeedbackRow & RoundOwnershipRow>(
      `SELECT
         f.*,
         i.recruiter_id,
         i.candidate_id
       FROM recruiter_interview_feedback f
       JOIN recruiter_interview_rounds r ON r.id = f.round_id
       JOIN recruiter_interviews i ON i.id = f.interview_id
       WHERE f.round_id = $1`,
      [roundId],
    );

    if (!rows.length) {
      throw new NotFoundException('Feedback not found');
    }

    this.assertAccess(rows[0], userId, role);
    return this.normalize(rows[0]);
  }

  async getByInterview(interviewId: string, userId: string, role: string) {
    await this.assertInterviewAccess(interviewId, userId, role);
    const { rows } = await this.db.query<FeedbackRow>(
      `SELECT *
       FROM recruiter_interview_feedback
       WHERE interview_id = $1
       ORDER BY created_at DESC`,
      [interviewId],
    );
    return rows.map((row) => this.normalize(row));
  }

  async getSummary(interviewId: string, userId: string, role: string) {
    await this.assertInterviewAccess(interviewId, userId, role);
    const { rows } = await this.db.query<{
      feedback_count: string;
      avg_technical: string | null;
      avg_communication: string | null;
      avg_problem_solving: string | null;
      avg_culture_fit: string | null;
      avg_overall: string | null;
    }>(
      `SELECT
         COUNT(*) AS feedback_count,
         AVG(technical_score) AS avg_technical,
         AVG(communication_score) AS avg_communication,
         AVG(problem_solving_score) AS avg_problem_solving,
         AVG(culture_fit_score) AS avg_culture_fit,
         AVG(overall_score) AS avg_overall
       FROM recruiter_interview_feedback
       WHERE interview_id = $1`,
      [interviewId],
    );

    const summary = rows[0];
    return {
      feedback_count: Number(summary.feedback_count ?? 0),
      avg_technical: summary.avg_technical
        ? Number(summary.avg_technical)
        : null,
      avg_communication: summary.avg_communication
        ? Number(summary.avg_communication)
        : null,
      avg_problem_solving: summary.avg_problem_solving
        ? Number(summary.avg_problem_solving)
        : null,
      avg_culture_fit: summary.avg_culture_fit
        ? Number(summary.avg_culture_fit)
        : null,
      avg_overall: summary.avg_overall ? Number(summary.avg_overall) : null,
    };
  }

  private async getOwnedRound(roundId: string, recruiterId: string) {
    const { rows } = await this.db.query<RoundOwnershipRow>(
      `SELECT
         r.id AS round_id,
         i.id AS interview_id,
         i.recruiter_id,
         i.candidate_id
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       WHERE r.id = $1`,
      [roundId],
    );

    if (!rows.length) {
      throw new NotFoundException('Interview round not found');
    }

    const row = rows[0];
    if (row.recruiter_id !== recruiterId) {
      throw new ForbiddenException('Not allowed to score this round');
    }

    return row;
  }

  private async assertInterviewAccess(
    interviewId: string,
    userId: string,
    role: string,
  ) {
    const { rows } = await this.db.query<InterviewOwnershipRow>(
      `SELECT id, recruiter_id, candidate_id
       FROM recruiter_interviews
       WHERE id = $1`,
      [interviewId],
    );

    if (!rows.length) {
      throw new NotFoundException('Interview not found');
    }

    this.assertAccess(rows[0], userId, role);
  }

  private assertAccess(
    row: { recruiter_id: string; candidate_id: string },
    userId: string,
    role: string,
  ) {
    if (role === 'recruiter' && row.recruiter_id !== userId) {
      throw new ForbiddenException('Not allowed to access this feedback');
    }

    if (role === 'candidate' && row.candidate_id !== userId) {
      throw new ForbiddenException('Not allowed to access this feedback');
    }
  }

  private validatePayload(
    payload: Partial<FeedbackPayload>,
    allowPartial: boolean,
  ) {
    const recommendation = payload.recommendation;
    const cultureFit = payload.culture_fit_score ?? 3;
    const requiredScores = [
      payload.technical_score,
      payload.communication_score,
      payload.problem_solving_score,
      cultureFit,
    ];

    if (!allowPartial) {
      if (
        !recommendation ||
        !['HIRE', 'REJECT', 'HOLD'].includes(recommendation)
      ) {
        throw new BadRequestException(
          'recommendation must be HIRE, HOLD, or REJECT',
        );
      }

      if (requiredScores.some((value) => typeof value !== 'number')) {
        throw new BadRequestException('All feedback scores are required');
      }
    }

    for (const value of requiredScores) {
      if (value !== undefined && (value < 1 || value > 5)) {
        throw new BadRequestException('Scores must be between 1 and 5');
      }
    }

    const technical = payload.technical_score ?? 0;
    const communication = payload.communication_score ?? 0;
    const problemSolving = payload.problem_solving_score ?? 0;
    const overall_score = Number(
      (
        ((technical + communication + problemSolving + cultureFit) / 4) *
        20
      ).toFixed(2),
    );

    return {
      technical_score: technical,
      communication_score: communication,
      problem_solving_score: problemSolving,
      culture_fit_score: cultureFit,
      overall_score,
      recommendation,
      strengths: payload.strengths?.trim(),
      improvements: payload.improvements?.trim(),
      notes: payload.notes?.trim(),
    };
  }

  private normalize(row: FeedbackRow) {
    return {
      ...row,
      technical_score: Number(row.technical_score),
      communication_score: Number(row.communication_score),
      problem_solving_score: Number(row.problem_solving_score),
      culture_fit_score: Number(row.culture_fit_score),
      overall_score: Number(row.overall_score),
    };
  }
}
