import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InterviewRemindersService {
  private readonly logger = new Logger(InterviewRemindersService.name);

  constructor(private readonly db: DatabaseService) {}

  @Cron('* * * * *')
  async sendUpcomingReminders() {
    await this.processReminderWindow(30, 'notify_30_sent');
    await this.processReminderWindow(15, 'notify_15_sent');
  }

  private async processReminderWindow(minutes: number, flagColumn: 'notify_30_sent' | 'notify_15_sent') {
    const { rows } = await this.db.query<any>(
      `SELECT r.*, i.candidate_id, i.recruiter_id, j.title AS job_title, u.email AS candidate_email
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       LEFT JOIN jobs j ON j.id = i.job_id
       LEFT JOIN users u ON u.id = i.candidate_id
       WHERE r.scheduled_at IS NOT NULL
         AND r.${flagColumn} = false
         AND r.scheduled_at > NOW()
         AND r.scheduled_at <= NOW() + ($1 || ' minutes')::interval`,
      [minutes],
    );

    for (const row of rows) {
      const title = `Interview starts in ${minutes} minutes`;
      const message = `${row.round_type} interview for ${row.job_title ?? 'your application'} starts soon.`;

      // in-app/device notification (alerts)
      await this.db.query(
        `INSERT INTO alerts (user_id, type, title, message, metadata)
         VALUES ($1, 'interview_reminder', $2, $3, $4::jsonb),
                ($5, 'interview_reminder', $2, $3, $4::jsonb)`,
        [
          row.candidate_id,
          title,
          message,
          JSON.stringify({ roundId: row.id, joinUrl: row.meeting_join_url, scheduledAt: row.scheduled_at }),
          row.recruiter_id,
        ],
      );

      // Email integration point (plug your mailer here)
      this.logger.log(`[EMAIL:${minutes}m] to=${row.candidate_email} subject="${title}"`);

      await this.db.query(
        `UPDATE recruiter_interview_rounds SET ${flagColumn} = true WHERE id = $1`,
        [row.id],
      );
    }
  }
}