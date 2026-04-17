import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  // Recruiter endpoints
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
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }

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
        metadata: {
          round_id: round.id,
          round_number: round.round_number,
          room_id: roomId,
        },
      },
    });

    return round;
  }

  async updateStage(recruiterId: string, interviewId: string, stage: string) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    if (!(stage in STAGE_TO_CODE)) {
      throw new BadRequestException('Invalid stage');
    }

    const updated = await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: stage as any,
        status_code: STAGE_TO_CODE[stage],
        final_status: ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(stage) ? stage : interview.final_status,
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
    const round = await this.prisma.recruiter_interview_rounds.findUnique({
      where: { id: roundId },
    });
    if (!round) throw new NotFoundException('Round not found');

    const interview = await this.prisma.recruiter_interviews.findUnique({
      where: { id: round.interview_id },
    });
    if (!interview || interview.recruiter_id !== recruiterId) {
      throw new ForbiddenException('Not allowed');
    }

    const updatedRound = await this.prisma.recruiter_interview_rounds.update({
      where: { id: roundId },
      data: {
        result: payload.result,
        score: payload.score ?? null,
        feedback: payload.feedback ?? null,
      },
    });

    // Optional auto-stage progression
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
        metadata: {
          round_id: roundId,
          result: payload.result,
          score: payload.score ?? null,
        },
      },
    });

    return updatedRound;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Candidate endpoints
  // ───────────────────────────────────────────────────────────────────────────

  async listCandidateInterviews(
    candidateId: string,
    params?: { statusCode?: number; limit?: number },
  ) {
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
  // Room access validation for REST + Socket join
  // ───────────────────────────────────────────────────────────────────────────

  async validateRoomAccess(roomId: string, userId: string, role: string) {
    const m = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(roomId);
    if (!m) return { allowed: false };

    const interviewId = m[1];
    const roundNumber = Number(m[2]);

    const [interview, round] = await Promise.all([
      this.prisma.recruiter_interviews.findUnique({
        where: { id: interviewId },
      }),
      this.prisma.recruiter_interview_rounds.findFirst({
        where: { interview_id: interviewId, round_number: roundNumber },
      }),
    ]);

    if (!interview || !round) return { allowed: false };

    const isCandidate = role === 'candidate' && interview.candidate_id === userId;
    const isRecruiter = role === 'recruiter' && interview.recruiter_id === userId;

    if (!isCandidate && !isRecruiter) return { allowed: false };

    return {
      allowed: true,
      roomId,
      interviewId,
      roundId: round.id,
      role,
      userId,
      name: undefined,
    };
  }
}