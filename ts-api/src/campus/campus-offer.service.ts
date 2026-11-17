// ts-api/src/campus/campus-offer.service.ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { CampusActor, CampusTenantService } from './campus-tenant.service';
import { ReleaseOfferDto, RespondOfferDto } from './dto/campus.dto';

@Injectable()
export class CampusOfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: CampusTenantService,
    private readonly alerts: AlertsService,
  ) {}

  async release(actor: CampusActor, driveId: string, dto: ReleaseOfferDto) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: dto.applicationId, jobId: drive.jobId },
      include: { campusOffer: true },
    });
    if (!application) throw new NotFoundException('Application not found in this drive.');
    if (application.campusOffer && application.campusOffer.status !== 'DRAFT') {
      throw new BadRequestException('An offer has already been released for this application.');
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.placementOffer.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          driveId,
          companyId: drive.companyId,
          status: 'RELEASED',
          ctc: dto.ctc ?? drive.ctcMax ?? drive.ctcMin ?? null,
          currency: dto.currency ?? drive.currency,
          roleTitle: dto.roleTitle ?? drive.job.title,
          location: dto.location ?? drive.location,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          letterPath: dto.letterPath ?? null,
          releasedAt: new Date(),
        },
        update: {
          status: 'RELEASED',
          ctc: dto.ctc ?? null,
          roleTitle: dto.roleTitle ?? drive.job.title,
          location: dto.location ?? drive.location,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          letterPath: dto.letterPath ?? null,
          releasedAt: new Date(),
        },
      });
      await tx.jobApplication.update({
        where: { id: application.id },
        data: { status: 'OFFERED', lastStatusChangedAt: new Date() },
      });
      await tx.candidateStatusEvent.create({
        data: {
          applicationId: application.id,
          fromStatus: application.status,
          toStatus: 'OFFERED',
          changedByUserId: actor.id,
          reason: 'Campus offer released',
          metadata: { offerId: saved.id, driveId } as Prisma.InputJsonValue,
        },
      });
      return saved;
    });

    await this.alerts.createAlert({
      userId: application.candidateUserId,
      type: 'application_update',
      title: 'Offer released 🎉',
      message: `You have received an offer for ${drive.title}.`,
      metadata: { driveId, offerId: offer.id, applicationId: application.id },
    }).catch(() => undefined);

    return offer;
  }

  async listForDrive(actor: CampusActor, driveId: string) {
    await this.tenant.requireDriveOwner(driveId, actor);
    return this.prisma.placementOffer.findMany({
      where: { driveId },
      include: {
        application: {
          select: {
            id: true, status: true,
            candidate: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForCollege(actor: CampusActor, collegeId: string) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role);
    return this.prisma.placementOffer.findMany({
      where: { application: { candidate: { campusStudents: { some: { collegeId } } } } },
      include: {
        drive: { select: { id: true, title: true } },
        company: { select: { id: true, name: true } },
        application: {
          select: {
            id: true, status: true,
            candidate: {
              select: {
                id: true, fullName: true, email: true,
                campusStudents: {
                  where: { collegeId },
                  select: { enrollmentNo: true, graduationYear: true, branch: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myOffers(userId: string) {
    return this.prisma.placementOffer.findMany({
      where: { application: { candidateUserId: userId }, status: { not: 'DRAFT' } },
      include: {
        drive: { select: { id: true, title: true, driveDate: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { releasedAt: 'desc' },
    });
  }

  async respond(userId: string, offerId: string, dto: RespondOfferDto) {
    const offer = await this.prisma.placementOffer.findUnique({
      where: { id: offerId },
      include: {
        application: { select: { id: true, candidateUserId: true, status: true } },
        drive: { select: { id: true, title: true, companyId: true, createdByUserId: true } },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found.');
    if (offer.application.candidateUserId !== userId) {
      throw new ForbiddenException('This offer does not belong to you.');
    }
    if (offer.status !== 'RELEASED') {
      throw new BadRequestException(`Offer is already ${offer.status}.`);
    }
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await this.prisma.placementOffer.update({ where: { id: offerId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This offer has expired.');
    }

    const accepted = dto.response === 'ACCEPTED';

    await this.prisma.$transaction(async (tx) => {
      await tx.placementOffer.update({
        where: { id: offerId },
        data: { status: accepted ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
      });
      await tx.jobApplication.update({
        where: { id: offer.application.id },
        data: {
          status: accepted ? 'HIRED' : 'WITHDRAWN',
          lastStatusChangedAt: new Date(),
        },
      });
      await tx.candidateStatusEvent.create({
        data: {
          applicationId: offer.application.id,
          fromStatus: offer.application.status,
          toStatus: accepted ? 'HIRED' : 'WITHDRAWN',
          changedByUserId: userId,
          reason: accepted ? 'Offer accepted by student' : 'Offer declined by student',
          metadata: { offerId, note: dto.note ?? null } as Prisma.InputJsonValue,
        },
      });

      // College policy: single-offer acceptance withdraws other live applications.
      if (accepted) {
        const student = await tx.collegeStudent.findFirst({
          where: { userId },
          include: { college: { include: { policy: true } } },
        });
        const policy = student?.college?.policy;
        if (policy && !policy.allowMultipleOffers) {
          const others = await tx.placementOffer.findMany({
            where: {
              id: { not: offerId },
              status: 'RELEASED',
              application: { candidateUserId: userId },
            },
            select: { id: true, applicationId: true },
          });
          for (const other of others) {
            await tx.placementOffer.update({ where: { id: other.id }, data: { status: 'REVOKED' } });
            await tx.jobApplication.update({
              where: { id: other.applicationId },
              data: { status: 'WITHDRAWN', lastStatusChangedAt: new Date() },
            });
          }
        }
      }
    });

    await this.alerts.createAlert({
      userId: offer.drive.createdByUserId,
      type: 'application_update',
      title: accepted ? 'Offer accepted' : 'Offer declined',
      message: `A candidate ${accepted ? 'accepted' : 'declined'} the offer for ${offer.drive.title}.`,
      metadata: { driveId: offer.drive.id, offerId },
    }).catch(() => undefined);

    return { offerId, status: accepted ? 'ACCEPTED' : 'DECLINED' };
  }

  async markJoined(actor: CampusActor, offerId: string) {
    const offer = await this.prisma.placementOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found.');
    await this.tenant.requireCompanyMember(actor.id, offer.companyId, actor.role);
    if (offer.status !== 'ACCEPTED') {
      throw new BadRequestException('Only accepted offers can be marked as joined.');
    }
    return this.prisma.placementOffer.update({
      where: { id: offerId }, data: { status: 'JOINED' },
    });
  }
}