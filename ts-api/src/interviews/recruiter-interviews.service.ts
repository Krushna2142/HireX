import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  InterviewRoundResult,
  InterviewStatus,
  InterviewType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
  passed: 'INTERVIEW_PASSED',
  fail: 'INTERVIEW_FAILED',
  failed: 'INTERVIEW_FAILED',
  no_show: 'ON_HOLD',
  reschedule: 'INTERVIEW_SCHEDULED',
};

@Injectable()
export class RecruiterInterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  async initInterview(applicationId: string, recruiterId: string) {
    const app = await this.prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        job: { recruiterUserId: recruiterId },
      },
      include: {
        job: true,
        candidate: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');

    const existing = await this.prisma.interview.findFirst({
      where: {
        applicationId,
        recruiterUserId: recruiterId,
      },
      include: {
        job: true,
        candidate: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });

    if (existing) return this.toInterviewDetail(existing);

    const interview = await this.prisma.interview.create({
      data: {
        applicationId: app.id,
        jobId: app.jobId,
        candidateUserId: app.candidateUserId,
        recruiterUserId: recruiterId,
        createdByUserId: recruiterId,
        type: InterviewType.RECRUITER_LIVE,
        status: InterviewStatus.SCHEDULED,
        title: `${app.job.title} interview`,
        jobTitle: app.job.title,
        companyName: app.job.companyName,
        metadata: this.withStage({}, 'APPLIED'),
      },
      include: {
        job: true,
        candidate: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
      },
    });

    return this.toInterviewDetail(interview);
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
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, recruiterUserId: recruiterId },
      include: { job: true, candidate: true },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new NotFoundException('Invalid schedule time');
    }

    const lastRound = await this.prisma.recruiterInterviewRound.findFirst({
      where: { interviewId },
      orderBy: { roundNumber: 'desc' },
    });
    const roundNumber = (lastRound?.roundNumber ?? 0) + 1;
    const roomSlug = `jc-${interviewId}-r${roundNumber}`;
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interviews/room/${roomSlug}`;

    const room = await this.prisma.interviewRoom.create({
      data: {
        interviewId,
        roomName: `Round ${roundNumber}`,
        provider: 'internal',
        providerRoomId: roomSlug,
        maxParticipants: 4,
        mode: payload.mode ?? 'video',
        hostUserId: recruiterId,
        joinUrl,
      },
    });

    const round = await this.prisma.recruiterInterviewRound.create({
      data: {
        interviewId,
        roundNumber,
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

    await this.updateStage(interviewId, recruiterId, 'INTERVIEW_SCHEDULED', true);

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        scheduledStartAt: scheduledAt,
        scheduledEndAt: new Date(scheduledAt.getTime() + (round.durationMins ?? 45) * 60 * 1000),
      },
    });

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId: recruiterId,
        eventType: 'round_scheduled',
        payload: {
          roundId: round.id,
          roundNumber,
          roundType: payload.roundType,
          scheduledAt: payload.scheduledAt,
          mode: payload.mode ?? 'video',
          roomId: room.id,
          joinUrl,
        },
      },
    });

    const when = scheduledAt.toLocaleString();
    const candidateName = interview.candidate.fullName ?? 'candidate';
    const jobTitle = interview.job?.title ?? interview.jobTitle ?? 'your application';

    await this.alerts.createBulkAlerts([
      {
        userId: interview.candidateUserId,
        type: 'interview_scheduled',
        title: 'Interview round scheduled',
        message: `${payload.roundType} round scheduled for ${jobTitle} on ${when}.`,
        metadata: { interviewId, roundId: round.id, roundNumber, joinUrl, scheduledAt: payload.scheduledAt },
      },
      {
        userId: recruiterId,
        type: 'interview_scheduled',
        title: 'Interview round scheduled',
        message: `${candidateName} is scheduled for round ${roundNumber} (${payload.roundType}) on ${when}.`,
        metadata: { interviewId, roundId: round.id, roundNumber, joinUrl, scheduledAt: payload.scheduledAt },
      },
    ]);

    return round;
  }

  async updateStage(
    interviewId: string,
    actorUserId: string,
    stage: StageKey,
    skipAuth = false,
  ) {
    const code = STAGE_TO_CODE[stage];
    if (!code) throw new NotFoundException('Invalid stage');

    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { job: true },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    if (!skipAuth && interview.recruiterUserId !== actorUserId) {
      throw new ForbiddenException('Not allowed');
    }

    const fromStage = this.currentStage(interview.metadata);
    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: this.stageToInterviewStatus(stage),
        completedAt: this.isTerminalStage(stage) ? new Date() : interview.completedAt,
        metadata: this.withStage(interview.metadata, stage),
      },
    });

    const applicationStatus = this.stageToApplicationStatus(stage);
    if (applicationStatus && interview.applicationId) {
      const previous = await this.prisma.jobApplication.findUnique({
        where: { id: interview.applicationId },
        select: { status: true },
      });

      await this.prisma.jobApplication.update({
        where: { id: interview.applicationId },
        data: {
          status: applicationStatus,
          lastStatusChangedAt: new Date(),
        },
      });

      await this.prisma.candidateStatusEvent.create({
        data: {
          applicationId: interview.applicationId,
          fromStatus: previous?.status ?? null,
          toStatus: applicationStatus,
          changedByUserId: actorUserId,
          metadata: { interviewId, stage },
        },
      });
    }

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId,
        eventType: 'STATUS_CHANGED',
        payload: { fromStage, toStage: stage, statusCode: code },
      },
    });

    const jobTitle = interview.job?.title ?? interview.jobTitle ?? 'your application';
    const stageMessage = this.stageMessage(stage, jobTitle);

    const payloads = [
      {
        userId: interview.candidateUserId,
        type: 'interview_stage',
        title: `Interview status: ${stage}`,
        message: stageMessage.candidate,
        metadata: { interviewId, stage, statusCode: code },
      },
    ];

    if (interview.recruiterUserId) {
      payloads.push({
        userId: interview.recruiterUserId,
        type: 'interview_stage',
        title: `Interview status: ${stage}`,
        message: stageMessage.recruiter,
        metadata: { interviewId, stage, statusCode: code },
      });
    }

    await this.alerts.createBulkAlerts(payloads);

    if (stage === 'REJECTED' && interview.applicationId) {
      await this.garbageRejectedResume(interview.candidateUserId, interview.applicationId);
    }

    return updated;
  }

  async submitRoundResult(
    roundId: string,
    recruiterId: string,
    payload: { result: string; score?: number; feedback?: string },
  ) {
    const round = await this.prisma.recruiterInterviewRound.findUnique({
      where: { id: roundId },
      include: {
        interview: {
          include: { job: true },
        },
      },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.interview.recruiterUserId !== recruiterId) {
      throw new ForbiddenException('Not allowed');
    }

    const result = this.toRoundResult(payload.result);
    const updated = await this.prisma.recruiterInterviewRound.update({
      where: { id: roundId },
      data: {
        result,
        score: payload.score ?? null,
        feedback: payload.feedback ?? null,
      },
    });

    await this.prisma.interviewEventLog.create({
      data: {
        interviewId: round.interviewId,
        actorUserId: recruiterId,
        eventType: 'ROUND_COMPLETED',
        payload: { roundId, result: payload.result },
      },
    });

    const nextStage = RESULT_TO_STAGE[payload.result];
    if (nextStage) {
      await this.updateStage(round.interviewId, recruiterId, nextStage, true);
    }

    const title = round.interview.job?.title ?? round.interview.jobTitle ?? 'your interview';
    const resultLabel = payload.result.replaceAll('_', ' ');
    const payloads = [
      {
        userId: round.interview.candidateUserId,
        type: 'interview_round_result',
        title: 'Interview round updated',
        message: `Round ${round.roundNumber} for ${title} is now marked ${resultLabel}.`,
        metadata: { roundId, roundNumber: round.roundNumber, interviewId: round.interviewId, result: payload.result },
      },
    ];

    if (round.interview.recruiterUserId) {
      payloads.push({
        userId: round.interview.recruiterUserId,
        type: 'interview_round_result',
        title: 'Interview round updated',
        message: `Round ${round.roundNumber} for ${title} is now marked ${resultLabel}.`,
        metadata: { roundId, roundNumber: round.roundNumber, interviewId: round.interviewId, result: payload.result },
      });
    }

    await this.alerts.createBulkAlerts(payloads);

    return updated;
  }

  async getDashboard(recruiterId: string, jobId?: string) {
    const rows = await this.prisma.interview.findMany({
      where: {
        recruiterUserId: recruiterId,
        ...(jobId ? { jobId } : {}),
        type: { not: InterviewType.AI_MOCK },
      },
      select: { metadata: true },
    });

    const dashboard = {
      total: rows.length,
      shortlisted: 0,
      rejected: 0,
      scheduled: 0,
      hired: 0,
    };

    for (const row of rows) {
      const stage = this.currentStage(row.metadata);
      if (stage === 'SHORTLISTED') dashboard.shortlisted += 1;
      if (stage === 'REJECTED') dashboard.rejected += 1;
      if (stage === 'INTERVIEW_SCHEDULED') dashboard.scheduled += 1;
      if (stage === 'HIRED') dashboard.hired += 1;
    }

    return dashboard;
  }

  async listInterviews(
    userId: string,
    role: string,
    opts: { statusCode?: number; limit?: number },
  ) {
    const limit = Math.min(opts.limit ?? 20, 100);
    const normalizedRole = role.toLowerCase();

    const rows = await this.prisma.interview.findMany({
      where: {
        type: { not: InterviewType.AI_MOCK },
        ...(normalizedRole === 'recruiter'
          ? { recruiterUserId: userId }
          : { candidateUserId: userId }),
      },
      include: { job: true, candidate: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return rows
      .map((row) => this.toInterviewSummary(row))
      .filter((row) => opts.statusCode === undefined || row.status_code === opts.statusCode);
  }

  async getInterview(interviewId: string, userId: string, role: string) {
    const row = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        job: true,
        candidate: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
        eventLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'recruiter' && row.recruiterUserId !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    if (normalizedRole !== 'recruiter' && row.candidateUserId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return {
      interview: this.toInterviewDetail(row),
      rounds: row.rounds,
      events: row.eventLogs,
    };
  }

  private async garbageRejectedResume(candidateId: string, applicationId: string) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { resumeId: true },
    });
    if (!app?.resumeId) return;

    await this.prisma.resume.update({
      where: { id: app.resumeId },
      data: {
        garbagedAt: new Date(),
        garbageReason: 'rejected',
      },
    });

    await this.prisma.jobseekerProfile.updateMany({
      where: { userId: candidateId, activeResumeId: app.resumeId },
      data: { activeResumeId: null },
    });
  }

  private toInterviewDetail(row: any) {
    return {
      ...this.toInterviewSummary(row),
      candidate_id: row.candidateUserId,
      recruiter_id: row.recruiterUserId,
      job_id: row.jobId,
      application_id: row.applicationId,
      rounds: row.rounds ?? [],
    };
  }

  private toInterviewSummary(row: any) {
    const metadata = this.metadataRecord(row.metadata);
    const stage = this.currentStage(row.metadata);

    return {
      id: row.id,
      current_stage: stage,
      status_code: metadata.statusCode ?? STAGE_TO_CODE[stage] ?? null,
      final_status: metadata.finalStatus ?? null,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      job_title: row.jobTitle ?? row.job?.title ?? null,
      company: row.companyName ?? row.job?.companyName ?? null,
      candidate_name: row.candidate?.fullName ?? null,
      candidate_email: row.candidate?.email ?? null,
    };
  }

  private withStage(metadata: Prisma.JsonValue | Record<string, unknown>, stage: string): Prisma.InputJsonObject {
    return {
      ...this.metadataRecord(metadata),
      currentStage: stage,
      statusCode: STAGE_TO_CODE[stage],
      finalStatus: this.isTerminalStage(stage) ? stage : this.metadataRecord(metadata).finalStatus ?? null,
    };
  }

  private currentStage(metadata: Prisma.JsonValue): StageKey {
    const record = this.metadataRecord(metadata);
    return typeof record.currentStage === 'string' && record.currentStage in STAGE_TO_CODE
      ? (record.currentStage as StageKey)
      : 'APPLIED';
  }

  private metadataRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private stageToInterviewStatus(stage: StageKey): InterviewStatus {
    if (stage === 'INTERVIEW_IN_PROGRESS') return InterviewStatus.IN_PROGRESS;
    if (this.isTerminalStage(stage)) return InterviewStatus.COMPLETED;
    if (stage === 'ON_HOLD' || stage === 'WITHDRAWN') return InterviewStatus.CANCELLED;
    return InterviewStatus.SCHEDULED;
  }

  private stageToApplicationStatus(stage: StageKey): ApplicationStatus | null {
    switch (stage) {
      case 'APPLIED':
        return ApplicationStatus.APPLIED;
      case 'UNDER_REVIEW':
        return ApplicationStatus.UNDER_REVIEW;
      case 'SHORTLISTED':
        return ApplicationStatus.SHORTLISTED;
      case 'INTERVIEW_SCHEDULED':
        return ApplicationStatus.INTERVIEW_SCHEDULED;
      case 'INTERVIEW_IN_PROGRESS':
        return ApplicationStatus.INTERVIEW_IN_PROGRESS;
      case 'INTERVIEW_PASSED':
        return ApplicationStatus.INTERVIEW_PASSED;
      case 'INTERVIEW_FAILED':
        return ApplicationStatus.INTERVIEW_FAILED;
      case 'FINAL_REVIEW':
        return ApplicationStatus.FINAL_REVIEW;
      case 'OFFERED':
        return ApplicationStatus.OFFERED;
      case 'HIRED':
        return ApplicationStatus.HIRED;
      case 'REJECTED':
        return ApplicationStatus.REJECTED;
      case 'ON_HOLD':
        return ApplicationStatus.ON_HOLD;
      case 'WITHDRAWN':
        return ApplicationStatus.WITHDRAWN;
      default:
        return null;
    }
  }

  private isTerminalStage(stage: string): boolean {
    return ['INTERVIEW_PASSED', 'INTERVIEW_FAILED', 'HIRED', 'REJECTED'].includes(stage);
  }

  private toRoundResult(result: string): InterviewRoundResult {
    switch (result) {
      case 'pass':
      case 'passed':
        return InterviewRoundResult.PASSED;
      case 'fail':
      case 'failed':
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
