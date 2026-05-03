import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class InterviewRemindersService {
  private readonly logger = new Logger(InterviewRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  @Cron('* * * * *')
  async sendUpcomingReminders() {
    await this.processReminderWindow(30, 'notify30Sent');
    await this.processReminderWindow(15, 'notify15Sent');
  }

  private async processReminderWindow(minutes: number, flagColumn: 'notify30Sent' | 'notify15Sent') {
    const now = new Date();
    const until = new Date(now.getTime() + minutes * 60 * 1000);

    const rounds = await this.prisma.recruiterInterviewRound.findMany({
      where: {
        scheduledAt: {
          gt: now,
          lte: until,
        },
        [flagColumn]: false,
      },
      include: {
        interview: {
          include: {
            job: true,
            candidate: true,
          },
        },
      },
    });

    for (const round of rounds) {
      const title = `Interview starts in ${minutes} minutes`;
      const jobTitle = round.interview.job?.title ?? round.interview.jobTitle ?? 'your application';
      const message = `${round.roundType} interview for ${jobTitle} starts soon.`;
      const metadata = {
        roundId: round.id,
        joinUrl: round.meetingJoinUrl,
        scheduledAt: round.scheduledAt,
      };

      const payloads = [
        {
          userId: round.interview.candidateUserId,
          type: 'interview_reminder',
          title,
          message,
          metadata,
        },
      ];

      if (round.interview.recruiterUserId) {
        payloads.push({
          userId: round.interview.recruiterUserId,
          type: 'interview_reminder',
          title,
          message,
          metadata,
        });
      }

      await this.alerts.createBulkAlerts(payloads);

      this.logger.log(`[EMAIL:${minutes}m] to=${round.interview.candidate.email} subject="${title}"`);

      await this.prisma.recruiterInterviewRound.update({
        where: { id: round.id },
        data: { [flagColumn]: true },
      });
    }
  }
}
