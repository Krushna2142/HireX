import { Injectable, NotFoundException } from '@nestjs/common';
import { InterviewStatus } from '@prisma/client';
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

    let slug: string | null = null;
    let interviewId = sessionId ?? null;

    if (recruiterRoundId) {
      const round = await this.prisma.recruiterInterviewRound.findUnique({
        where: { id: recruiterRoundId },
      });
      if (!round) throw new NotFoundException('Round not found');

      interviewId = round.interviewId;
      slug = `jc-${round.interviewId}-r${round.roundNumber}`;
    }

    const room = await this.prisma.interviewRoom.create({
      data: {
        interviewId,
        roomName: roomName ?? null,
        provider: provider ?? 'internal',
        providerRoomId: slug,
        maxParticipants: maxParticipants ?? 4,
        hostUserId,
        joinUrl: slug ? `/interviews/room/${slug}` : null,
      },
    });

    if (slug && recruiterRoundId) {
      await this.prisma.recruiterInterviewRound.update({
        where: { id: recruiterRoundId },
        data: { meetingRoomId: room.id, meetingJoinUrl: `/interviews/room/${slug}` },
      });
    }

    return {
      id: room.id,
      joinUrl: room.joinUrl ?? `/interviews/room/${room.id}`,
      provider: room.provider,
      maxParticipants: room.maxParticipants,
    };
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.interviewRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async joinRoom(roomId: string, userId: string, displayName?: string, role?: string) {
    const room = await this.prisma.interviewRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const existing = await this.prisma.roomParticipant.findFirst({
      where: { roomId, userId },
    });

    if (existing) {
      return this.prisma.roomParticipant.update({
        where: { id: existing.id },
        data: {
          leftAt: null,
          displayName: displayName ?? existing.displayName,
          role: role ?? existing.role,
        },
      });
    }

    return this.prisma.roomParticipant.create({
      data: {
        roomId,
        userId,
        displayName: displayName ?? null,
        role: role ?? 'participant',
      },
    });
  }

  async leaveRoom(roomId: string, userId: string) {
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { roomId, userId },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    await this.prisma.roomParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
    });

    return { ok: true };
  }

  async startSession(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId,
        eventType: 'room_started_via_api',
        payload: { roundId },
      },
    });

    await this.prisma.interview.updateMany({
      where: { id: interviewId },
      data: { status: InterviewStatus.IN_PROGRESS },
    });

    return { ok: true };
  }

  async endSession(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.interviewEventLog.create({
      data: {
        interviewId,
        actorUserId,
        eventType: 'room_ended_via_api',
        payload: { roundId },
      },
    });
    return { ok: true };
  }
}
