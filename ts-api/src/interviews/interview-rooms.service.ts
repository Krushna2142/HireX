import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InterviewRoundResult,
  InterviewStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';

type AppRole = 'candidate' | 'recruiter' | 'admin' | 'super_admin' | string;

export type RoomAccessResult = {
  allowed: boolean;
  reason?:
    | 'room_not_found'
    | 'forbidden'
    | 'room_locked'
    | 'interview_missing';
  roomId?: string;
  providerRoomId?: string | null;
  interviewId?: string | null;
  roundId?: string | null;
  role?: string;
  userId?: string;
  hostUserId?: string | null;
  isHost?: boolean;
  isRecruiter?: boolean;
  isCandidate?: boolean;
  isAdmin?: boolean;
  room?: {
    id: string;
    provider: string;
    providerRoomId: string | null;
    roomName: string | null;
    mode: string;
    isLocked: boolean;
    startedAt: Date | null;
    endedAt: Date | null;
    joinUrl: string | null;
    maxParticipants: number;
  };
  interview?: {
    id: string;
    title: string | null;
    jobTitle: string | null;
    companyName: string | null;
    status: string;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
  } | null;
};

export type MediaStateInput = {
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
  bandwidthKbps?: number;
  resolution?: string;
  metadata?: Record<string, unknown>;
};

export type RoomEventInput = {
  eventType: string;
  payload?: Record<string, unknown>;
};

export type ChatMessageInput = {
  message: string;
  messageType?: 'text' | 'system' | 'code' | 'file';
  fileUrl?: string;
  metadata?: Record<string, unknown>;
};

export type ScorecardCriterion = {
  key: string;
  label: string;
  checked: boolean;
  score?: number;
  comment?: string;
  aiSuggestion?: string;
};

export type ScorecardInput = {
  criteria: ScorecardCriterion[];
  comments?: string;
  recommendation?:
    | 'strong_hire'
    | 'hire'
    | 'hold'
    | 'reject'
    | 'strong_reject';
};

export type AIAssistInput = {
  transcript?: string;
  currentNotes?: string;
  candidateLevel?: 'junior' | 'mid' | 'senior';
};

@Injectable()
export class InterviewRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
  ) {}

  private normalizeRole(role?: AppRole): string {
    const value = String(role ?? '').toLowerCase();

    if (value === 'jobseeker') return 'candidate';
    if (value === 'job_seeker') return 'candidate';
    if (value === 'super_admin') return 'super_admin';

    return value;
  }

  private isAdminRole(role?: AppRole): boolean {
    const normalized = this.normalizeRole(role);
    return normalized === 'admin' || normalized === 'super_admin';
  }

  private toJson(value: Record<string, unknown>): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }

  private calculateTotalScore(criteria: ScorecardCriterion[]): number | null {
    const scored = criteria
      .map((item) => Number(item.score ?? 0))
      .filter((score) => Number.isFinite(score) && score > 0);

    if (scored.length === 0) return null;

    const average =
      scored.reduce((total, score) => total + score, 0) / scored.length;

    return Math.round(average * 10) / 10;
  }

  private async findRoomByIdOrProviderRoomId(roomId: string) {
    return this.prisma.interviewRoom.findFirst({
      where: {
        OR: [
          { id: roomId },
          { providerRoomId: roomId },
        ],
      },
    });
  }

  private async findPrimaryRound(roomId: string, interviewId?: string | null) {
    const room = await this.findRoomByIdOrProviderRoomId(roomId);

    if (!room) return null;

    const byRoom = await this.prisma.recruiterInterviewRound.findFirst({
      where: {
        meetingRoomId: room.id,
      },
      orderBy: {
        roundNumber: 'asc',
      },
    });

    if (byRoom) return byRoom;

    if (!interviewId) return null;

    return this.prisma.recruiterInterviewRound.findFirst({
      where: {
        interviewId,
      },
      orderBy: {
        roundNumber: 'asc',
      },
    });
  }

  async validateRoomAccess(
    roomId: string,
    userId: string,
    role?: AppRole,
  ): Promise<RoomAccessResult> {
    const room = await this.findRoomByIdOrProviderRoomId(roomId);

    if (!room) {
      return {
        allowed: false,
        reason: 'room_not_found',
        roomId,
        userId,
        role: this.normalizeRole(role),
      };
    }

    const normalizedRole = this.normalizeRole(role);
    const isAdmin = this.isAdminRole(role);

    if (!room.interviewId) {
      return {
        allowed: false,
        reason: 'interview_missing',
        roomId: room.id,
        providerRoomId: room.providerRoomId,
        userId,
        role: normalizedRole,
      };
    }

    const interview = await this.prisma.interview.findUnique({
      where: {
        id: room.interviewId,
      },
    });

    if (!interview) {
      return {
        allowed: false,
        reason: 'interview_missing',
        roomId: room.id,
        providerRoomId: room.providerRoomId,
        userId,
        role: normalizedRole,
      };
    }

    const round = await this.findPrimaryRound(room.id, interview.id);

    const isHost = room.hostUserId === userId;
    const isCandidate = interview.candidateUserId === userId;
    const isRecruiter =
      interview.recruiterUserId === userId ||
      interview.createdByUserId === userId ||
      round?.interviewerId === userId;

    const allowed = isAdmin || isHost || isCandidate || isRecruiter;

    if (!allowed) {
      return {
        allowed: false,
        reason: 'forbidden',
        roomId: room.id,
        providerRoomId: room.providerRoomId,
        userId,
        role: normalizedRole,
      };
    }

    return {
      allowed: true,
      roomId: room.id,
      providerRoomId: room.providerRoomId,
      interviewId: room.interviewId,
      roundId: round?.id ?? null,
      role: normalizedRole,
      userId,
      hostUserId: room.hostUserId,
      isHost,
      isRecruiter,
      isCandidate,
      isAdmin,
      room: {
        id: room.id,
        provider: room.provider,
        providerRoomId: room.providerRoomId,
        roomName: room.roomName,
        mode: room.mode,
        isLocked: room.isLocked,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
        joinUrl: room.joinUrl,
        maxParticipants: room.maxParticipants,
      },
      interview: {
        id: interview.id,
        title: interview.title,
        jobTitle: interview.jobTitle,
        companyName: interview.companyName,
        status: interview.status,
        scheduledStartAt: interview.scheduledStartAt,
        scheduledEndAt: interview.scheduledEndAt,
      },
    };
  }

  async getAccessOrThrow(roomId: string, userId: string, role?: AppRole) {
    const access = await this.validateRoomAccess(roomId, userId, role);

    if (!access.allowed) {
      if (access.reason === 'room_not_found') {
        throw new NotFoundException('Interview room not found');
      }

      throw new ForbiddenException('Not allowed to access this interview room');
    }

    return access;
  }

  async getRoomState(roomId: string, userId: string, role?: AppRole) {
    const access = await this.getAccessOrThrow(roomId, userId, role);

    const room = await this.findRoomByIdOrProviderRoomId(roomId);

    if (!room) {
      throw new NotFoundException('Interview room not found');
    }

    const interview = room.interviewId
      ? await this.prisma.interview.findUnique({
          where: {
            id: room.interviewId,
          },
          include: {
            candidate: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
            recruiter: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        })
      : null;

    const participants = await this.prisma.roomParticipant.findMany({
      where: {
        roomId: room.id,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        mediaState: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    const chatMessages = await this.prisma.interviewChatMessage.findMany({
      where: {
        roomId: room.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
    });

    const eventLogs = await this.prisma.interviewEventLog.findMany({
      where: {
        roomId: room.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const rounds = await this.prisma.recruiterInterviewRound.findMany({
      where: {
        OR: [
          { meetingRoomId: room.id },
          ...(room.interviewId ? [{ interviewId: room.interviewId }] : []),
        ],
      },
      orderBy: {
        roundNumber: 'asc',
      },
    });

    const scorecard = room.interviewId
      ? await this.prisma.interviewScorecard.findFirst({
          where: {
            interviewId: room.interviewId,
            createdByUserId: userId,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })
      : null;

    return {
      access,
      room: {
        ...room,
        interview,
        participants,
        chatMessages,
        eventLogs,
        recruiterRounds: rounds,
      },
      scorecard,
      serverTime: new Date().toISOString(),
    };
  }

  async joinRoom(
    roomId: string,
    userId: string,
    role?: AppRole,
    displayName?: string,
    rtcClientId?: string,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);

    const room = await this.findRoomByIdOrProviderRoomId(roomId);

    if (!room) {
      throw new NotFoundException('Interview room not found');
    }

    if (room.isLocked && !access.isHost && !access.isAdmin) {
      throw new ForbiddenException('Interview room is locked');
    }

    const participantRole = access.isRecruiter
      ? 'recruiter'
      : access.isCandidate
        ? 'candidate'
        : access.isAdmin
          ? 'admin'
          : 'participant';

    const existing = await this.prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId,
      },
    });

    const participant = existing
      ? await this.prisma.roomParticipant.update({
          where: {
            id: existing.id,
          },
          data: {
            leftAt: null,
            displayName: displayName ?? existing.displayName,
            role: participantRole,
            rtcClientId: rtcClientId ?? existing.rtcClientId,
          },
        })
      : await this.prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId,
            displayName: displayName ?? null,
            role: participantRole,
            rtcClientId: rtcClientId ?? null,
            metadata: this.toJson({
              joinedVia: 'api',
              roleFromAccess: access.role,
            }),
          },
        });

    await this.prisma.mediaState.upsert({
      where: {
        participantId: participant.id,
      },
      create: {
        participantId: participant.id,
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        metadata: this.toJson({
          source: 'join_room_default',
        }),
      },
      update: {
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
      },
    });

    await this.prisma.interviewRoom.update({
      where: {
        id: room.id,
      },
      data: {
        startedAt: room.startedAt ?? new Date(),
        endedAt: null,
      },
    });

    if (access.interviewId) {
      await this.prisma.interview.updateMany({
        where: {
          id: access.interviewId,
        },
        data: {
          status: InterviewStatus.IN_PROGRESS,
        },
      });
    }

    await this.recordRoomEvent(room.id, userId, {
      eventType: 'participant_joined',
      payload: {
        participantId: participant.id,
        participantRole,
        rtcClientId: rtcClientId ?? null,
      },
    });

    return {
      ok: true,
      access,
      participant,
    };
  }

  async leaveRoom(roomId: string, userId: string, role?: AppRole) {
    const access = await this.getAccessOrThrow(roomId, userId, role);

    const actualRoomId = access.roomId ?? roomId;

    const participant = await this.prisma.roomParticipant.findFirst({
      where: {
        roomId: actualRoomId,
        userId,
      },
    });

    if (!participant) {
      return {
        ok: true,
        alreadyLeft: true,
      };
    }

    await this.prisma.roomParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        leftAt: new Date(),
      },
    });

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'participant_left',
      payload: {
        participantId: participant.id,
      },
    });

    return {
      ok: true,
    };
  }

  async updateMediaState(
    roomId: string,
    userId: string,
    role: AppRole | undefined,
    input: MediaStateInput,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);
    const actualRoomId = access.roomId ?? roomId;

    const participant = await this.prisma.roomParticipant.findFirst({
      where: {
        roomId: actualRoomId,
        userId,
      },
    });

    if (!participant) {
      throw new BadRequestException('Join the room before updating media state');
    }

    const audioEnabled = input.audioEnabled ?? !participant.isMuted;
    const videoEnabled = input.videoEnabled ?? !participant.isVideoOff;
    const screenSharing = input.screenSharing ?? false;

    await this.prisma.roomParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        isMuted: !audioEnabled,
        isVideoOff: !videoEnabled,
      },
    });

    const mediaState = await this.prisma.mediaState.upsert({
      where: {
        participantId: participant.id,
      },
      create: {
        participantId: participant.id,
        audioEnabled,
        videoEnabled,
        screenSharing,
        bandwidthKbps: input.bandwidthKbps,
        resolution: input.resolution,
        metadata: this.toJson(input.metadata ?? {}),
      },
      update: {
        audioEnabled,
        videoEnabled,
        screenSharing,
        bandwidthKbps: input.bandwidthKbps,
        resolution: input.resolution,
        metadata: this.toJson(input.metadata ?? {}),
      },
    });

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'media_state_changed',
      payload: {
        participantId: participant.id,
        audioEnabled,
        videoEnabled,
        screenSharing,
        bandwidthKbps: input.bandwidthKbps ?? null,
        resolution: input.resolution ?? null,
      },
    });

    return {
      ok: true,
      mediaState,
    };
  }

  async recordRoomEvent(
    roomId: string,
    actorUserId: string,
    input: RoomEventInput,
  ) {
    const room = await this.findRoomByIdOrProviderRoomId(roomId);

    if (!room) {
      throw new NotFoundException('Interview room not found');
    }

    const round = await this.findPrimaryRound(room.id, room.interviewId);

    return this.prisma.interviewEventLog.create({
      data: {
        roomId: room.id,
        interviewId: room.interviewId,
        actorUserId,
        eventType: input.eventType,
        payload: this.toJson({
          ...(input.payload ?? {}),
          roundId: round?.id ?? null,
        }),
      },
    });
  }

  async sendChatMessage(
    roomId: string,
    userId: string,
    role: AppRole | undefined,
    input: ChatMessageInput,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);
    const actualRoomId = access.roomId ?? roomId;

    const message = input.message?.trim();

    if (!message) {
      throw new BadRequestException('Message is required');
    }

    const saved = await this.prisma.interviewChatMessage.create({
      data: {
        roomId: actualRoomId,
        interviewId: access.interviewId ?? undefined,
        senderId: userId,
        message,
        messageType: input.messageType ?? 'text',
        fileUrl: input.fileUrl,
        metadata: this.toJson(input.metadata ?? {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'chat_message_sent',
      payload: {
        messageId: saved.id,
        messageType: saved.messageType,
      },
    });

    return saved;
  }

  async getScorecard(roomId: string, userId: string, role?: AppRole) {
    const access = await this.getAccessOrThrow(roomId, userId, role);

    if (!access.interviewId) {
      throw new BadRequestException('Room is not linked to an interview');
    }

    const scorecard = await this.prisma.interviewScorecard.findFirst({
      where: {
        interviewId: access.interviewId,
        createdByUserId: userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      scorecard,
      defaults: this.defaultScorecardCriteria(),
    };
  }

  async saveScorecard(
    roomId: string,
    userId: string,
    role: AppRole | undefined,
    input: ScorecardInput,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);
    const actualRoomId = access.roomId ?? roomId;

    if (!access.interviewId) {
      throw new BadRequestException('Room is not linked to an interview');
    }

    if (!access.isRecruiter && !access.isAdmin && !access.isHost) {
      throw new ForbiddenException('Only recruiters can save interview scoring');
    }

    if (!Array.isArray(input.criteria) || input.criteria.length === 0) {
      throw new BadRequestException('Scorecard criteria are required');
    }

    const totalScore = this.calculateTotalScore(input.criteria);

    const rubric = {
      criteria: input.criteria,
      recommendation: input.recommendation ?? null,
      savedAt: new Date().toISOString(),
    };

    const existing = await this.prisma.interviewScorecard.findFirst({
      where: {
        interviewId: access.interviewId,
        createdByUserId: userId,
      },
    });

    const scorecard = existing
      ? await this.prisma.interviewScorecard.update({
          where: {
            id: existing.id,
          },
          data: {
            rubric: this.toJson(rubric),
            totalScore,
            comments: input.comments,
          },
        })
      : await this.prisma.interviewScorecard.create({
          data: {
            interviewId: access.interviewId,
            createdByUserId: userId,
            rubric: this.toJson(rubric),
            totalScore,
            comments: input.comments,
          },
        });

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'scorecard_saved',
      payload: {
        scorecardId: scorecard.id,
        totalScore,
        recommendation: input.recommendation ?? null,
      },
    });

    return {
      ok: true,
      scorecard,
    };
  }

  async generateFollowUpQuestion(
    roomId: string,
    userId: string,
    role: AppRole | undefined,
    input: AIAssistInput,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);
    const actualRoomId = access.roomId ?? roomId;

    if (!access.isRecruiter && !access.isAdmin && !access.isHost) {
      throw new ForbiddenException('Only recruiters can use AI assist');
    }

    const room = await this.findRoomByIdOrProviderRoomId(actualRoomId);

    if (!room || !room.interviewId) {
      throw new NotFoundException('Interview context not found');
    }

    const interview = await this.prisma.interview.findUnique({
      where: {
        id: room.interviewId,
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const transcript =
      input.transcript ||
      (await this.getTranscriptText(actualRoomId)) ||
      input.currentNotes ||
      'No transcript yet. Suggest a strong opening or follow-up question.';

    const jobDescription = [
      interview.jobTitle,
      interview.companyName,
      interview.title,
    ]
      .filter(Boolean)
      .join(' | ');

    const suggestion = await this.ai.suggestFollowUpQuestion(
      transcript,
      jobDescription || 'General software/job interview',
      input.candidateLevel ?? 'mid',
    );

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'ai_follow_up_generated',
      payload: {
        suggestion,
      },
    });

    return {
      suggestion,
    };
  }

  async generateAISummary(
    roomId: string,
    userId: string,
    role: AppRole | undefined,
    input: AIAssistInput,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);
    const actualRoomId = access.roomId ?? roomId;

    if (!access.isRecruiter && !access.isAdmin && !access.isHost) {
      throw new ForbiddenException('Only recruiters can generate AI summary');
    }

    const room = await this.findRoomByIdOrProviderRoomId(actualRoomId);

    if (!room || !room.interviewId) {
      throw new NotFoundException('Interview context not found');
    }

    const interview = await this.prisma.interview.findUnique({
      where: {
        id: room.interviewId,
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const transcript =
      input.transcript ||
      (await this.getTranscriptText(actualRoomId)) ||
      input.currentNotes ||
      '';

    const prompt = `
You are an AI interview assistant for a recruiter-led hiring interview.

Create a concise recruiter summary using this context.

Job Title: ${interview.jobTitle ?? 'Unknown'}
Company: ${interview.companyName ?? 'Unknown'}
Interview Title: ${interview.title ?? 'Unknown'}

Transcript / Notes:
${transcript || 'No transcript available yet.'}

Return ONLY valid JSON:
{
  "summary": "short summary",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1", "concern 2"],
  "recommendedFollowUp": "one next question",
  "suggestedDecision": "advance | hold | reject",
  "confidence": 0.0
}
`;

    const raw = await this.ai.askGeneral(prompt);

    let parsed: unknown;

    try {
      parsed = JSON.parse(
        raw.replace(/```json/g, '').replace(/```/g, '').trim(),
      );
    } catch {
      parsed = {
        summary: raw,
        strengths: [],
        concerns: [],
        recommendedFollowUp: 'Ask for one deeper project example.',
        suggestedDecision: 'hold',
        confidence: 0.5,
      };
    }

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'ai_summary_generated',
      payload: {
        summary: parsed,
      },
    });

    return {
      summary: parsed,
    };
  }

  async endRoom(
    roomId: string,
    userId: string,
    role?: AppRole,
    payload?: Record<string, unknown>,
  ) {
    const access = await this.getAccessOrThrow(roomId, userId, role);
    const actualRoomId = access.roomId ?? roomId;

    if (!access.isRecruiter && !access.isAdmin && !access.isHost) {
      throw new ForbiddenException('Only recruiter/host can end interview');
    }

    await this.prisma.interviewRoom.update({
      where: {
        id: actualRoomId,
      },
      data: {
        endedAt: new Date(),
        isLocked: true,
      },
    });

    if (access.interviewId) {
      await this.prisma.interview.updateMany({
        where: {
          id: access.interviewId,
        },
        data: {
          status: InterviewStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }

    if (access.roundId) {
      await this.prisma.recruiterInterviewRound.updateMany({
        where: {
          id: access.roundId,
          result: InterviewRoundResult.PENDING,
        },
        data: {
          result: InterviewRoundResult.PASSED,
          feedback:
            typeof payload?.feedback === 'string'
              ? payload.feedback
              : undefined,
          score:
            typeof payload?.score === 'number'
              ? payload.score
              : undefined,
        },
      });
    }

    await this.recordRoomEvent(actualRoomId, userId, {
      eventType: 'interview_completed',
      payload: payload ?? {},
    });

    return {
      ok: true,
      endedAt: new Date().toISOString(),
    };
  }

  private async getTranscriptText(roomId: string): Promise<string> {
    const room = await this.findRoomByIdOrProviderRoomId(roomId);

    if (!room) return '';

    const rows = await this.prisma.interviewTranscript.findMany({
      where: {
        roomId: room.id,
      },
      orderBy: {
        timestamp: 'asc',
      },
      take: 500,
    });

    return rows.map((row) => row.content).join('\n');
  }

  private defaultScorecardCriteria(): ScorecardCriterion[] {
    return [
      {
        key: 'technical',
        label: 'Technical Knowledge',
        checked: false,
        score: 0,
        comment: '',
      },
      {
        key: 'aptitude',
        label: 'Aptitude',
        checked: false,
        score: 0,
        comment: '',
      },
      {
        key: 'communication',
        label: 'Communication',
        checked: false,
        score: 0,
        comment: '',
      },
      {
        key: 'problem_solving',
        label: 'Problem Solving',
        checked: false,
        score: 0,
        comment: '',
      },
      {
        key: 'culture_fit',
        label: 'Culture Fit',
        checked: false,
        score: 0,
        comment: '',
      },
      {
        key: 'confidence',
        label: 'Confidence',
        checked: false,
        score: 0,
        comment: '',
      },
      {
        key: 'role_fit',
        label: 'Role Fit',
        checked: false,
        score: 0,
        comment: '',
      },
    ];
  }
}