import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type CreateRoomInput = {
  recruiterRoundId?: string;
  sessionId?: string;
  hostUserId: string;
  roomName?: string;
  maxParticipants?: number;
  provider?: string;
};

@Injectable()
export class InterviewRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(input: CreateRoomInput) {
    const { recruiterRoundId, sessionId, hostUserId, roomName, maxParticipants, provider } = input;

    // If recruiterRoundId is provided, try to compute a human-friendly slug
    let slug: string | null = null;
    if (recruiterRoundId) {
      const round = await this.prisma.recruiter_interview_rounds.findUnique({ where: { id: recruiterRoundId } });
      if (!round) throw new NotFoundException('Round not found');
      // Keep backwards-compatible slug used elsewhere in the app
      slug = `jc-${round.interview_id}-r${round.round_number}`;
    }

    const room = await this.prisma.interview_rooms.create({
      data: {
        recruiter_round_id: recruiterRoundId ?? null,
        session_id: sessionId ?? null,
        room_name: roomName ?? null,
        provider: provider ?? 'internal',
        max_participants: maxParticipants ?? 4,
        host_user_id: hostUserId,
        join_url: slug ? `/interviews/room/${slug}` : null,
      },
    });

    // If slug was computed, persist as meeting_room_id for existing round compatibility
    if (slug && recruiterRoundId) {
      await this.prisma.recruiter_interview_rounds.update({
        where: { id: recruiterRoundId },
        data: { meeting_room_id: slug, meeting_join_url: `/interviews/room/${slug}` },
      });
    }

    return {
      id: room.id,
      joinUrl: room.join_url ?? `/interviews/room/${room.id}`,
      provider: room.provider,
      maxParticipants: room.max_participants,
    };
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.interview_rooms.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async joinRoom(roomId: string, userId: string, displayName?: string, role?: string) {
    // Validate room exists
    const room = await this.prisma.interview_rooms.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // Upsert participant for this user
    const participant = await this.prisma.room_participants.upsert({
      where: { id: `${roomId}_${userId}` },
      create: {
        id: `${roomId}_${userId}`,
        room_id: roomId,
        user_id: userId,
        display_name: displayName ?? null,
        role: role ?? 'participant',
      },
      update: {
        left_at: null,
        display_name: displayName ?? undefined,
        role: role ?? undefined,
      },
    });

    return participant;
  }

  async leaveRoom(roomId: string, userId: string) {
    const participantId = `${roomId}_${userId}`;
    const p = await this.prisma.room_participants.findUnique({ where: { id: participantId } });
    if (!p) throw new NotFoundException('Participant not found');

    await this.prisma.room_participants.update({ where: { id: participantId }, data: { left_at: new Date() } });

    return { ok: true };
  }

  async startSession(interviewId: string, roundId: string, actorUserId: string) {
    // Delegated to existing recruiter flow for auditing
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_started_via_api',
        metadata: { roundId },
      },
    });

    // best-effort update recruiter_interviews stage
    await this.prisma.recruiter_interviews.updateMany({
      where: { id: interviewId },
      data: { current_stage: 'INTERVIEW_IN_PROGRESS', status_code: 500 },
    });

    return { ok: true };
  }

  async endSession(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_ended_via_api',
        metadata: { roundId },
      },
    });
    return { ok: true };
  }
}
