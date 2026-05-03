import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterviewRoundResult,
  InterviewStatus,
  InterviewType,
  Prisma,
} from '@prisma/client';
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
  hostUserId?: string | null;
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

  async startSession(
    userId: string,
    jobTitle: string,
    company: string,
    sessionType = 'technical',
    jobId?: string,
  ) {
    if (!jobTitle?.trim()) throw new BadRequestException('jobTitle is required');

    const session = await this.prisma.interview.create({
      data: {
        candidateUserId: userId,
        jobId: jobId ?? null,
        createdByUserId: userId,
        type: InterviewType.AI_MOCK,
        status: InterviewStatus.IN_PROGRESS,
        title: `${jobTitle.trim()} mock interview`,
        jobTitle: jobTitle.trim(),
        companyName: company ?? null,
        metadata: {
          sessionType: sessionType ?? 'technical',
          totalQuestions: 5,
          currentStage: 'INTERVIEW_IN_PROGRESS',
          statusCode: STAGE_TO_CODE.INTERVIEW_IN_PROGRESS,
        },
      },
    });

    const starterQuestions = [
      {
        questionNumber: 1,
        question: `Tell me about yourself and your fit for ${jobTitle}.`,
        category: 'behavioral',
        difficulty: 'easy',
        idealAnswer: 'Structured summary of experience, strengths, and relevance to role.',
      },
      {
        questionNumber: 2,
        question: `Explain a challenging problem you solved in your recent project.`,
        category: 'problem_solving',
        difficulty: 'medium',
        idealAnswer: 'Context, challenge, action, result with measurable impact.',
      },
      {
        questionNumber: 3,
        question: 'How do you ensure quality while delivering under deadlines?',
        category: 'execution',
        difficulty: 'medium',
        idealAnswer: 'Testing, prioritization, tradeoff communication, risk mitigation.',
      },
      {
        questionNumber: 4,
        question: 'Describe your approach to collaboration with cross-functional teams.',
        category: 'communication',
        difficulty: 'easy',
        idealAnswer: 'Clear communication, ownership, conflict handling, alignment.',
      },
      {
        questionNumber: 5,
        question: 'Why do you want to join this company?',
        category: 'motivation',
        difficulty: 'easy',
        idealAnswer: 'Company alignment, role impact, growth path.',
      },
    ];

    await this.prisma.interviewQuestion.createMany({
      data: starterQuestions.map((q) => ({
        interviewId: session.id,
        ...q,
      })),
    });

    return this.toSessionResponse(session);
  }

  async submitAnswer(
    questionId: string,
    userId: string,
    answer: string,
    timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    const q = await this.prisma.interviewQuestion.findUnique({
      where: { id: questionId },
      include: { interview: true },
    });

    if (!q) throw new NotFoundException('Question not found');
    if (q.interview.candidateUserId !== userId) {
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

    const updated = await this.prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        userAnswer: clean,
        timeTakenSecs,
        answeredAt: new Date(),
        score,
        feedback,
      },
    });

    return {
      ...this.toQuestionRow(updated),
      evaluation: { score, feedback },
      idealAnswer: q.idealAnswer ?? '',
    };
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidateUserId !== userId) throw new ForbiddenException('Not allowed');

    const qs = await this.prisma.interviewQuestion.findMany({
      where: { interviewId: sessionId },
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

    const metadata = this.withStage(session.metadata, 'INTERVIEW_PASSED');

    const updated = await this.prisma.interview.update({
      where: { id: sessionId },
      data: {
        status: InterviewStatus.COMPLETED,
        overallScore: overall,
        completedAt: new Date(),
        metadata,
      },
    });

    return this.toSessionResponse(updated);
  }

  async getSessionHistory(userId: string) {
    const sessions = await this.prisma.interview.findMany({
      where: {
        candidateUserId: userId,
        type: InterviewType.AI_MOCK,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => this.toSessionResponse(session));
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidateUserId !== userId) throw new ForbiddenException('Not allowed');

    const questions = await this.prisma.interviewQuestion.findMany({
      where: { interviewId: sessionId },
      orderBy: { questionNumber: 'asc' },
    });

    return {
      session: this.toSessionResponse(session),
      questions: questions.map((q) => this.toQuestionRow(q)),
    };
  }

  async listRecruiterInterviews(
    recruiterId: string,
    params?: { statusCode?: number; limit?: number },
  ) {
    const rows = await this.prisma.interview.findMany({
      where: {
        recruiterUserId: recruiterId,
        type: { not: InterviewType.AI_MOCK },
      },
      include: {
        job: true,
        candidate: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: params?.limit ?? 30,
    });

    return rows
      .map((row) => this.toInterviewSummary(row))
      .filter((row) => params?.statusCode === undefined || row.status_code === params.statusCode);
  }

  async getRecruiterInterview(recruiterId: string, interviewId: string) {
    const row = await this.prisma.interview.findFirst({
      where: { id: interviewId, recruiterUserId: recruiterId },
      include: {
        job: true,
        candidate: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Interview not found');

    return {
      ...this.toInterviewSummary(row),
      candidate_id: row.candidateUserId,
      recruiter_id: row.recruiterUserId,
      job_id: row.jobId,
      rounds: row.rounds,
    };
  }

  async scheduleRound(recruiterId: string, interviewId: string, payload: ScheduleRoundInput) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, recruiterUserId: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid scheduledAt');

    const lastRound = await this.prisma.recruiterInterviewRound.findFirst({
      where: { interviewId },
      orderBy: { roundNumber: 'desc' },
    });

    const nextRoundNumber = (lastRound?.roundNumber ?? 0) + 1;
    const slug = `jc-${interviewId}-r${nextRoundNumber}`;
    const joinUrl = `/interviews/room/${slug}`;

    const room = await this.prisma.interviewRoom.create({
      data: {
        interviewId,
        roomName: `Round ${nextRoundNumber}`,
        provider: 'internal',
        providerRoomId: slug,
        maxParticipants: 4,
        mode: payload.mode ?? 'video',
        hostUserId: recruiterId,
        joinUrl,
      },
    });

    const round = await this.prisma.recruiterInterviewRound.create({
      data: {
        interviewId,
        roundNumber: nextRoundNumber,
        roundType: payload.roundType,
        scheduledAt,
        durationMins: payload.durationMins ?? 45,
        mode: payload.mode ?? 'video',
        interviewerId: payload.interviewerId ?? recruiterId,
        meetingProvider: 'internal',
        meetingRoomId: room.id,
        meetingJoinUrl: joinUrl,
        result: InterviewRoundResult.PENDING,
      },
    });

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.SCHEDULED,
        scheduledStartAt: scheduledAt,
        scheduledEndAt: new Date(scheduledAt.getTime() + (round.durationMins ?? 45) * 60 * 1000),
        metadata: this.withStage(interview.metadata, 'INTERVIEW_SCHEDULED'),
      },
    });

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId: recruiterId,
        eventType: 'round_scheduled',
        payload: { roundId: round.id, roundNumber: round.roundNumber, roomId: room.id, joinUrl },
      },
    });

    return round;
  }

  async updateStage(recruiterId: string, interviewId: string, stage: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, recruiterUserId: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!(stage in STAGE_TO_CODE)) throw new BadRequestException('Invalid stage');

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: this.stageToInterviewStatus(stage),
        completedAt: this.isTerminalStage(stage) ? new Date() : interview.completedAt,
        metadata: this.withStage(interview.metadata, stage),
      },
    });

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId: recruiterId,
        eventType: 'stage_changed',
        payload: {
          fromStage: this.currentStage(interview),
          toStage: stage,
        },
      },
    });

    return updated;
  }

  async submitRoundResult(recruiterId: string, roundId: string, payload: RoundResultInput) {
    const round = await this.prisma.recruiterInterviewRound.findUnique({
      where: { id: roundId },
      include: { interview: true },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.interview.recruiterUserId !== recruiterId) {
      throw new ForbiddenException('Not allowed');
    }

    const result = this.toRoundResult(payload.result);
    const updatedRound = await this.prisma.recruiterInterviewRound.update({
      where: { id: roundId },
      data: {
        result,
        score: payload.score ?? null,
        feedback: payload.feedback ?? null,
      },
    });

    const nextStage =
      result === InterviewRoundResult.PASSED
        ? 'INTERVIEW_PASSED'
        : result === InterviewRoundResult.FAILED
          ? 'INTERVIEW_FAILED'
          : null;

    if (nextStage) {
      await this.prisma.interview.update({
        where: { id: round.interviewId },
        data: {
          status: InterviewStatus.COMPLETED,
          metadata: this.withStage(round.interview.metadata, nextStage),
        },
      });
    }

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId: round.interviewId,
        actorUserId: recruiterId,
        eventType: 'round_result_submitted',
        payload: { roundId, result: payload.result, score: payload.score ?? null },
      },
    });

    return updatedRound;
  }

  async listCandidateInterviews(candidateId: string, params?: { statusCode?: number; limit?: number }) {
    const rows = await this.prisma.interview.findMany({
      where: {
        candidateUserId: candidateId,
        type: { not: InterviewType.AI_MOCK },
      },
      include: { job: true },
      orderBy: { updatedAt: 'desc' },
      take: params?.limit ?? 30,
    });

    return rows
      .map((row) => this.toInterviewSummary(row))
      .filter((row) => params?.statusCode === undefined || row.status_code === params.statusCode);
  }

  async getCandidateInterview(candidateId: string, interviewId: string) {
    const row = await this.prisma.interview.findFirst({
      where: { id: interviewId, candidateUserId: candidateId },
      include: {
        job: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
        eventLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!row) throw new NotFoundException('Interview not found');

    return {
      ...this.toInterviewSummary(row),
      rounds: row.rounds,
      events: row.eventLogs,
    };
  }

  async validateRoomAccess(roomId: string, userId: string, role: string) {
    return this.validateRoomAccessWithContext(roomId, userId, role);
  }

  async validateRoomAccessWithContext(roomId: string, userId: string, role: string): Promise<RoomAccessResult> {
    const m = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(roomId);
    if (!m) return { allowed: false, reason: 'invalid_room' };

    const interviewId = m[1];
    const roundNumber = Number(m[2]);

    const [interview, round] = await Promise.all([
      this.prisma.interview.findUnique({ where: { id: interviewId } }),
      this.prisma.recruiterInterviewRound.findFirst({
        where: { interviewId, roundNumber },
      }),
    ]);

    if (!interview || !round) return { allowed: false, reason: 'room_not_found' };

    const normalizedRole = role.toLowerCase();
    const isCandidate =
      ['candidate', 'jobseeker', 'job_seeker'].includes(normalizedRole) &&
      interview.candidateUserId === userId;
    const isRecruiter = normalizedRole === 'recruiter' && interview.recruiterUserId === userId;
    if (!isCandidate && !isRecruiter) return { allowed: false, reason: 'forbidden' };

    if (round.scheduledAt) {
      const scheduledAt = round.scheduledAt.getTime();
      const durationMs = (round.durationMins ?? 45) * 60 * 1000;
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
          hostUserId: interview.recruiterUserId,
          interviewStage: this.currentStage(interview),
          scheduledAt: round.scheduledAt.toISOString(),
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
      hostUserId: interview.recruiterUserId,
      interviewStage: this.currentStage(interview),
      scheduledAt: round.scheduledAt ? round.scheduledAt.toISOString() : null,
      expiresAt: round.scheduledAt
        ? new Date(round.scheduledAt.getTime() + ((round.durationMins ?? 45) + 120) * 60 * 1000).toISOString()
        : null,
    };
  }

  async markRoomStarted(interviewId: string, roundId: string, actorUserId: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview) return;

    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: InterviewStatus.IN_PROGRESS,
          metadata: this.withStage(interview.metadata, 'INTERVIEW_IN_PROGRESS'),
        },
      });
    }

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId,
        eventType: 'room_started',
        payload: { roundId },
      },
    });
  }

  async markRoomEnded(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId,
        eventType: 'room_ended',
        payload: { roundId },
      },
    });
  }

  private toQuestionRow(q: {
    id: string;
    interviewId: string;
    questionNumber: number;
    question: string;
    category: string | null;
    difficulty: string;
    idealAnswer: string | null;
    userAnswer: string | null;
    score: number | null;
    feedback: string | null;
    timeTakenSecs: number | null;
    answeredAt: Date | null;
    createdAt: Date;
  }): InterviewQuestionRow {
    return {
      id: q.id,
      session_id: q.interviewId,
      question_number: q.questionNumber,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      ideal_answer: q.idealAnswer,
      user_answer: q.userAnswer,
      score: q.score,
      feedback: q.feedback,
      time_taken_secs: q.timeTakenSecs,
      answered_at: q.answeredAt,
      created_at: q.createdAt,
    };
  }

  private toSessionResponse(interview: {
    id: string;
    candidateUserId: string;
    jobId: string | null;
    jobTitle: string | null;
    companyName: string | null;
    type: InterviewType;
    status: InterviewStatus;
    overallScore: number | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    metadata: Prisma.JsonValue;
  }) {
    const metadata = this.metadataRecord(interview.metadata);

    return {
      id: interview.id,
      candidate_id: interview.candidateUserId,
      job_id: interview.jobId,
      job_title: interview.jobTitle,
      company: interview.companyName,
      session_type: metadata.sessionType ?? interview.type.toLowerCase(),
      status: interview.status.toLowerCase(),
      total_questions: metadata.totalQuestions ?? null,
      overall_score: interview.overallScore,
      completed_at: interview.completedAt,
      created_at: interview.createdAt,
      updated_at: interview.updatedAt,
    };
  }

  private toInterviewSummary(row: any) {
    const metadata = this.metadataRecord(row.metadata);

    return {
      id: row.id,
      current_stage: metadata.currentStage ?? this.currentStage(row),
      status_code: metadata.statusCode ?? STAGE_TO_CODE[metadata.currentStage as string] ?? null,
      final_status: metadata.finalStatus ?? null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      job_title: row.jobTitle ?? row.job?.title ?? null,
      company: row.companyName ?? row.job?.companyName ?? null,
      candidate_name: row.candidate?.fullName ?? null,
      candidate_email: row.candidate?.email ?? null,
    };
  }

  private metadataRecord(value: Prisma.JsonValue | null | undefined): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private currentStage(interview: { metadata: Prisma.JsonValue; status: InterviewStatus }): string {
    const metadata = this.metadataRecord(interview.metadata);
    if (typeof metadata.currentStage === 'string') return metadata.currentStage;
    return interview.status === InterviewStatus.IN_PROGRESS
      ? 'INTERVIEW_IN_PROGRESS'
      : interview.status === InterviewStatus.COMPLETED
        ? 'INTERVIEW_PASSED'
        : 'INTERVIEW_SCHEDULED';
  }

  private withStage(metadata: Prisma.JsonValue, stage: string): Prisma.InputJsonObject {
    return {
      ...this.metadataRecord(metadata),
      currentStage: stage,
      statusCode: STAGE_TO_CODE[stage],
      finalStatus: this.isTerminalStage(stage) ? stage : this.metadataRecord(metadata).finalStatus ?? null,
    };
  }

  private stageToInterviewStatus(stage: string): InterviewStatus {
    if (stage === 'INTERVIEW_IN_PROGRESS') return InterviewStatus.IN_PROGRESS;
    if (this.isTerminalStage(stage)) return InterviewStatus.COMPLETED;
    if (stage === 'ON_HOLD' || stage === 'WITHDRAWN') return InterviewStatus.CANCELLED;
    return InterviewStatus.SCHEDULED;
  }

  private isTerminalStage(stage: string): boolean {
    return ['INTERVIEW_PASSED', 'INTERVIEW_FAILED', 'HIRED', 'REJECTED'].includes(stage);
  }

  private toRoundResult(result: RoundResultInput['result']): InterviewRoundResult {
    switch (result) {
      case 'pass':
        return InterviewRoundResult.PASSED;
      case 'fail':
        return InterviewRoundResult.FAILED;
      case 'no_show':
        return InterviewRoundResult.NO_SHOW;
      case 'reschedule':
        return InterviewRoundResult.CANCELLED;
      case 'pending':
      default:
        return InterviewRoundResult.PENDING;
    }
  }
}
