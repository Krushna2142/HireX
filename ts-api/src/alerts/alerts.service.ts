/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAlertPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface AlertRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: Date;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAlert(payload: CreateAlertPayload): Promise<AlertRow> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: this.toNotificationType(payload.type),
        channel: NotificationChannel.IN_APP,
        title: payload.title,
        body: payload.message,
        sentAt: new Date(),
        metadata: this.toJson({
          ...(payload.metadata || {}),
          legacyType: payload.type,
        }),
      },
    });

    this.logger.log(`Notification created: ${payload.type} for user ${payload.userId}`);
    return this.toAlertRow(notification);
  }

  async createBulkAlerts(payloads: CreateAlertPayload[]): Promise<AlertRow[]> {
    if (payloads.length === 0) return [];

    const rows = await Promise.all(
      payloads.map((payload) => this.createAlert(payload)),
    );

    return rows;
  }

  async notifyMatchingCandidates(job: any) {
    try {
      const requiredSkills = this.stringArray(job.requiredSkills ?? job.required_skills);
      const minExperience = Number(job.experienceMin ?? job.experience_min ?? 0);
      const maxExperience =
        job.experienceMax ?? job.experience_max
          ? Number(job.experienceMax ?? job.experience_max)
          : null;

      const candidates = await this.prisma.jobseekerProfile.findMany({
        where: {
          isVisible: true,
          ...(requiredSkills.length ? { topSkills: { hasSome: requiredSkills } } : {}),
          OR: [
            { experienceYears: null },
            {
              experienceYears: {
                gte: minExperience,
                ...(maxExperience !== null ? { lte: maxExperience } : {}),
              },
            },
          ],
        },
        select: { userId: true },
        take: 500,
      });

      if (candidates.length === 0) return;

      const company = job.companyName ?? job.company ?? 'A company';
      const alerts = candidates.map(c => ({
        userId: c.userId,
        type: 'job_match',
        title: `New job match: ${job.title}`,
        message: `${company} is hiring for "${job.title}" and matches your skills`,
        metadata: {
          job_id: job.id,
          company,
          location: job.location,
          work_mode: job.workMode ?? job.work_mode,
          salary_min: job.salaryMin ?? job.salary_min,
          salary_max: job.salaryMax ?? job.salary_max,
        },
      }));

      await this.createBulkAlerts(alerts);
      this.logger.log(`Notified ${candidates.length} candidates for job ${job.id}`);
    } catch (err) {
      this.logger.error(`Failed to notify candidates for job ${job.id}: ${(err as Error).message}`);
    }
  }

  async getUserAlerts(userId: string, page = 1, limit = 20): Promise<{
    alerts: AlertRow[];
    unread: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const [alerts, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      alerts: alerts.map((alert) => this.toAlertRow(alert)),
      unread,
      page,
      limit,
    };
  }

  async markRead(userId: string, alertIds?: string[]): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(alertIds?.length ? { id: { in: alertIds } } : {}),
      },
      data: { readAt: new Date() },
    });

    return { success: true };
  }

  private toAlertRow(notification: Notification): AlertRow {
    const metadata = this.metadataRecord(notification.metadata);

    return {
      id: notification.id,
      user_id: notification.userId,
      type: typeof metadata.legacyType === 'string' ? metadata.legacyType : notification.type.toLowerCase(),
      title: notification.title,
      message: notification.body ?? '',
      metadata,
      read: notification.readAt !== null,
      created_at: notification.createdAt,
    };
  }

  private toNotificationType(type: string): NotificationType {
    const normalized = type.toLowerCase();

    if (normalized.includes('auth') || normalized.includes('login') || normalized.includes('password')) {
      return NotificationType.AUTH;
    }
    if (normalized.includes('application') || normalized.includes('candidate')) {
      return NotificationType.APPLICATION;
    }
    if (normalized.includes('interview') || normalized.includes('round')) {
      return NotificationType.INTERVIEW;
    }
    if (normalized.includes('job')) {
      return NotificationType.JOB;
    }
    if (normalized.includes('resume')) {
      return NotificationType.RESUME;
    }
    if (normalized.includes('admin')) {
      return NotificationType.ADMIN;
    }

    return NotificationType.SYSTEM;
  }

  private toJson(data: Record<string, any>): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonObject;
  }

  private metadataRecord(value: Prisma.JsonValue): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
