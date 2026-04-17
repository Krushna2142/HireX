import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AnswerEvaluation = {
  score: number;
  feedback: string;
};

export type InterviewQuestionRow = {
  id: string;
  session_id: string;
  question_number: number;
  question: string;
  category: string | null;
  difficulty: string | null;
  ideal_answer: string | null;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
  time_taken_secs: number | null;
  answered_at: Date | null;
  created_at: Date | null;
};

type ScheduleRoundInput = {
  roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
  scheduledAt: string;
  durationMins?: number;
  mode?: 'video' | 'phone' | 'offline';
  interviewerId?: string;
};

type RoundResultInput = {
  result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
  score?: number;
  feedback?: string;
};

type RoomAccessResult = {
  allowed: boolean;
  reason?: 'invalid_room' | 'room_not_found' | 'forbidden' | 'room_link_expired';
  roomId?: string;
  interviewId?: string;
  roundId?: string;
  role?: string;
  userId?: string;
  hostUserId?: string;
  interviewStage?: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
};

const STAGE_TO_CODE: Record<string, number> = {
  APPLIED: 100,
  UNDER_REVIEW: 200,
  SHORTLISTED: 300,
  INTERVIEW_SCHEDULED: 400,
  INTERVIEW_IN_PROGRESS: 500,
  INTERVIEW_PASSED: 600,
  INTERVIEW_FAILED: 650,
  FINAL_REVIEW: 700,
  OFFERED: 800,
  HIRED: 900,
  REJECTED: 950,
  ON_HOLD: 120,
  WITHDRAWN: 980,
};

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // MOCK INTERVIEW (used by interviews.controller.ts)
  // ───────────────────────────────────────────────────────────────────────────

  async startSession(
    userId: string,
    jobTitle: string,
    company: string,
    sessionType = 'technical',
    jobId?: string,
  ) {
    if (!jobTitle?.trim()) throw new BadRequestException('jobTitle is required');

    const session = await this.prisma.interview_sessions.create({
      data: {
        candidate_id: userId,
        job_id: jobId ?? null,
        job_title: jobTitle.trim(),
        company: company ?? null,
        session_type: sessionType ?? 'technical',
        status: 'in_progress',
        total_questions: 5,
      },
    });

    const starterQuestions = [
      {
        question_number: 1,
        question: `Tell me about yourself and your fit for ${jobTitle}.`,
        category: 'behavioral',
        difficulty: 'easy',
        ideal_answer: 'Structured summary of experience, strengths, and relevance to role.',
      },
      {
        question_number: 2,
        question: `Explain a challenging problem you solved in your recent project.`,
        category: 'problem_solving',
        difficulty: 'medium',
        ideal_answer: 'Context, challenge, action, result with measurable impact.',
      },
      {
        question_number: 3,
        question: `How do you ensure quality while delivering under deadlines?`,
        category: 'execution',
        difficulty: 'medium',
        ideal_answer: 'Testing, prioritization, tradeoff communication, risk mitigation.',
      },
      {
        question_number: 4,
        question: `Describe your approach to collaboration with cross-functional teams.`,
        category: 'communication',
        difficulty: 'easy',
        ideal_answer: 'Clear communication, ownership, conflict handling, alignment.',
      },
      {
        question_number: 5,
        question: `Why do you want to join this company?`,
        category: 'motivation',
        difficulty: 'easy',
        ideal_answer: 'Company alignment, role impact, growth path.',
      },
    ];

    await this.prisma.interview_questions.createMany({
      data: starterQuestions.map((q) => ({
        session_id: session.id,
        ...q,
      })),
    });

    return session;
  }

  async submitAnswer(
    questionId: string,
    userId: string,
    answer: string,
    timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    const q = await this.prisma.interview_questions.findUnique({
      where: { id: questionId },
      include: { interview_sessions: true },
    });

    if (!q) throw new NotFoundException('Question not found');
    if (q.interview_sessions.candidate_id !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const clean = (answer ?? '').trim();
    const len = clean.length;
    const score = Math.max(0, Math.min(100, Math.round((len / 280) * 100)));
    const feedback =
      len < 60
        ? 'Answer too short; add context, action, and result.'
        : len < 160
        ? 'Good start; include stronger measurable outcomes.'
        : 'Strong answer structure and detail.';

    const updated = await this.prisma.interview_questions.update({
      where: { id: questionId },
      data: {
        user_answer: clean,
        time_taken_secs: timeTakenSecs,
        answered_at: new Date(),
        score,
        feedback,
      },
    });

    return {
      ...(updated as InterviewQuestionRow),
      evaluation: { score, feedback },
      idealAnswer: q.ideal_answer ?? '',
    };
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const qs = await this.prisma.interview_questions.findMany({
      where: { session_id: sessionId },
    });

    const scored = qs.filter((x) => typeof x.score === 'number');
    const overall =
      scored.length > 0
        ? Number(
            (
              scored.reduce((sum, x) => sum + Number(x.score ?? 0), 0) / scored.length
            ).toFixed(2),
          )
        : null;

    return this.prisma.interview_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        overall_score: overall,
        completed_at: new Date(),
      },
    });
  }

  async getSessionHistory(userId: string) {
    return this.prisma.interview_sessions.findMany({
      where: { candidate_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const questions = await this.prisma.interview_questions.findMany({
      where: { session_id: sessionId },
      orderBy: { question_number: 'asc' },
    });

    return { session, questions };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECRUITER INTERVIEW PIPELINE
  // ───────────────────────────────────────────────────────────────────────────

  async listRecruiterInterviews(
    recruiterId: string,
    params?: { statusCode?: number; limit?: number },
  ) {
    const rows = await this.prisma.recruiter_interviews.findMany({
      where: {
        recruiter_id: recruiterId,
        ...(typeof params?.statusCode === 'number' ? { status_code: params.statusCode } : {}),
      },
      orderBy: { updated_at: 'desc' },
      take: params?.limit ?? 30,
    });

    if (!rows.length) return [];

    const jobIds = [...new Set(rows.map((r) => r.job_id))];
    const candidateIds = [...new Set(rows.map((r) => r.candidate_id))];

    const [jobs, users] = await Promise.all([
      this.prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.users.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, full_name: true, email: true },
      }),
    ]);

    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => ({
      id: r.id,
      current_stage: r.current_stage,
      status_code: r.status_code,
      final_status: r.final_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: jobMap.get(r.job_id)?.title ?? null,
      company: jobMap.get(r.job_id)?.company ?? null,
      candidate_name: userMap.get(r.candidate_id)?.full_name ?? null,
      candidate_email: userMap.get(r.candidate_id)?.email ?? null,
    }));
  }

  async getRecruiterInterview(recruiterId: string, interviewId: string) {
    const row = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const [job, candidate, rounds] = await Promise.all([
      this.prisma.job.findUnique({
        where: { id: row.job_id },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.users.findUnique({
        where: { id: row.candidate_id },
        select: { id: true, full_name: true, email: true },
      }),
      this.prisma.recruiter_interview_rounds.findMany({
        where: { interview_id: row.id },
        orderBy: { round_number: 'asc' },
      }),
    ]);

    return {
      id: row.id,
      current_stage: row.current_stage,
      status_code: row.status_code,
      final_status: row.final_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      candidate_id: row.candidate_id,
      recruiter_id: row.recruiter_id,
      job_id: row.job_id,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      candidate_name: candidate?.full_name ?? null,
      candidate_email: candidate?.email ?? null,
      rounds,
    };
  }

  async scheduleRound(recruiterId: string, interviewId: string, payload: ScheduleRoundInput) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid scheduledAt');

    const lastRound = await this.prisma.recruiter_interview_rounds.findFirst({
      where: { interview_id: interviewId },
      orderBy: { round_number: 'desc' },
    });

    const nextRoundNumber = (lastRound?.round_number ?? 0) + 1;
    const roomId = `jc-${interviewId}-r${nextRoundNumber}`;
    const joinUrl = `/interviews/room/${roomId}`;

    const round = await this.prisma.recruiter_interview_rounds.create({
      data: {
        interview_id: interviewId,
        round_number: nextRoundNumber,
        round_type: payload.roundType,
        scheduled_at: scheduledAt,
        duration_mins: payload.durationMins ?? 45,
        mode: payload.mode ?? 'video',
        interviewer_id: payload.interviewerId ?? recruiterId,
        meeting_provider: 'internal',
        meeting_room_id: roomId,
        meeting_join_url: joinUrl,
        result: 'pending',
      },
    });

    await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: 'INTERVIEW_SCHEDULED',
        status_code: STAGE_TO_CODE.INTERVIEW_SCHEDULED,
      },
    });

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: recruiterId,
        event_type: 'round_scheduled',
        metadata: { round_id: round.id, round_number: round.round_number, room_id: roomId },
      },
    });

    return round;
  }

  async updateStage(recruiterId: string, interviewId: string, stage: string) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!(stage in STAGE_TO_CODE)) throw new BadRequestException('Invalid stage');

    const updated = await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: stage as any,
        status_code: STAGE_TO_CODE[stage],
        final_status: ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(stage)
          ? stage
          : interview.final_status,
      },
    });

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: recruiterId,
        event_type: 'stage_changed',
        from_stage: interview.current_stage,
        to_stage: stage,
      },
    });

    return updated;
  }

  async submitRoundResult(recruiterId: string, roundId: string, payload: RoundResultInput) {
    const round = await this.prisma.recruiter_interview_rounds.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Round not found');

    const interview = await this.prisma.recruiter_interviews.findUnique({
      where: { id: round.interview_id },
    });
    if (!interview || interview.recruiter_id !== recruiterId) throw new ForbiddenException('Not allowed');

    const updatedRound = await this.prisma.recruiter_interview_rounds.update({
      where: { id: roundId },
      data: {
        result: payload.result,
        score: payload.score ?? null,
        feedback: payload.feedback ?? null,
      },
    });

    if (payload.result === 'pass') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interview.id },
        data: {
          current_stage: 'INTERVIEW_PASSED',
          status_code: STAGE_TO_CODE.INTERVIEW_PASSED,
        },
      });
    } else if (payload.result === 'fail') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interview.id },
        data: {
          current_stage: 'INTERVIEW_FAILED',
          status_code: STAGE_TO_CODE.INTERVIEW_FAILED,
        },
      });
    }

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interview.id,
        actor_user_id: recruiterId,
        event_type: 'round_result_submitted',
        metadata: { round_id: roundId, result: payload.result, score: payload.score ?? null },
      },
    });

    return updatedRound;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CANDIDATE VIEWS
  // ───────────────────────────────────────────────────────────────────────────

  async listCandidateInterviews(candidateId: string, params?: { statusCode?: number; limit?: number }) {
    const rows = await this.prisma.recruiter_interviews.findMany({
      where: {
        candidate_id: candidateId,
        ...(typeof params?.statusCode === 'number' ? { status_code: params.statusCode } : {}),
      },
      orderBy: { updated_at: 'desc' },
      take: params?.limit ?? 30,
    });

    if (!rows.length) return [];

    const jobIds = [...new Set(rows.map((r) => r.job_id))];
    const jobs = await this.prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, title: true, company: true },
    });
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    return rows.map((r) => ({
      id: r.id,
      current_stage: r.current_stage,
      status_code: r.status_code,
      final_status: r.final_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: jobMap.get(r.job_id)?.title ?? null,
      company: jobMap.get(r.job_id)?.company ?? null,
    }));
  }

  async getCandidateInterview(candidateId: string, interviewId: string) {
    const row = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, candidate_id: candidateId },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const [job, rounds] = await Promise.all([
      this.prisma.job.findUnique({
        where: { id: row.job_id },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.recruiter_interview_rounds.findMany({
        where: { interview_id: row.id },
        orderBy: { round_number: 'asc' },
      }),
    ]);

    return {
      id: row.id,
      current_stage: row.current_stage,
      status_code: row.status_code,
      final_status: row.final_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      rounds,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROOM ACCESS VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  async validateRoomAccess(roomId: string, userId: string, role: string) {
    return this.validateRoomAccessWithContext(roomId, userId, role);
  }

  async validateRoomAccessWithContext(roomId: string, userId: string, role: string): Promise<RoomAccessResult> {
    const m = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(roomId);
    if (!m) return { allowed: false, reason: 'invalid_room' };

    const interviewId = m[1];
    const roundNumber = Number(m[2]);

    const [interview, round] = await Promise.all([
      this.prisma.recruiter_interviews.findUnique({ where: { id: interviewId } }),
      this.prisma.recruiter_interview_rounds.findFirst({
        where: { interview_id: interviewId, round_number: roundNumber },
      }),
    ]);

    if (!interview || !round) return { allowed: false, reason: 'room_not_found' };

    const isCandidate = role === 'candidate' && interview.candidate_id === userId;
    const isRecruiter = role === 'recruiter' && interview.recruiter_id === userId;
    if (!isCandidate && !isRecruiter) return { allowed: false, reason: 'forbidden' };

    // Expiring room URL policy:
    // Join opens 30 minutes before schedule and expires 2 hours after round end.
    if (round.scheduled_at) {
      const scheduledAt = round.scheduled_at.getTime();
      const durationMs = (round.duration_mins ?? 45) * 60 * 1000;
      const startsAtMs = scheduledAt - 30 * 60 * 1000;
      const expiresAtMs = scheduledAt + durationMs + 2 * 60 * 60 * 1000;
      const now = Date.now();

      if (now < startsAtMs || now > expiresAtMs) {
        return {
          allowed: false,
          reason: 'room_link_expired',
          roomId,
          interviewId,
          roundId: round.id,
          role,
          userId,
          hostUserId: interview.recruiter_id,
          interviewStage: interview.current_stage,
          scheduledAt: round.scheduled_at.toISOString(),
          expiresAt: new Date(expiresAtMs).toISOString(),
        };
      }
    }

    return {
      allowed: true,
      roomId,
      interviewId,
      roundId: round.id,
      role,
      userId,
      hostUserId: interview.recruiter_id,
      interviewStage: interview.current_stage,
      scheduledAt: round.scheduled_at ? round.scheduled_at.toISOString() : null,
      expiresAt: round.scheduled_at
        ? new Date(round.scheduled_at.getTime() + ((round.duration_mins ?? 45) + 120) * 60 * 1000).toISOString()
        : null,
    };
  }

  async markRoomStarted(interviewId: string, roundId: string, actorUserId: string) {
    const interview = await this.prisma.recruiter_interviews.findUnique({ where: { id: interviewId } });
    if (!interview) return;

    if (interview.current_stage !== 'INTERVIEW_IN_PROGRESS') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interviewId },
        data: {
          current_stage: 'INTERVIEW_IN_PROGRESS',
          status_code: STAGE_TO_CODE.INTERVIEW_IN_PROGRESS,
        },
      });
    }

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_started',
        metadata: { round_id: roundId },
      },
    });
  }

  async markRoomEnded(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_ended',
        metadata: { round_id: roundId },
      },
    });
  }
}