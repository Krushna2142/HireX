// ts-api/src/campus/campus-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampusActor, CampusTenantService } from './campus-tenant.service';

@Injectable()
export class CampusAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: CampusTenantService,
  ) {}

  async driveAnalytics(actor: CampusActor, driveId: string) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);

    const [total, byStatus, byEligibility, offers, students] = await Promise.all([
      this.prisma.jobApplication.count({ where: { jobId: drive.jobId } }),
      this.prisma.jobApplication.groupBy({
        by: ['status'], where: { jobId: drive.jobId }, _count: { _all: true },
      }),
      this.prisma.campusApplicationDetail.groupBy({
        by: ['eligibilityStatus'], where: { driveId }, _count: { _all: true },
      }),
      this.prisma.placementOffer.groupBy({
        by: ['status'], where: { driveId }, _count: { _all: true },
      }),
      this.prisma.collegeStudent.findMany({
        where: { user: { applications: { some: { jobId: drive.jobId } } } },
        select: {
          graduationYear: true,
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    const byBranch = new Map<string, { branch: string; count: number }>();
    const byBatch = new Map<number, number>();
    for (const s of students) {
      const entry = byBranch.get(s.branch.id) ?? { branch: s.branch.name, count: 0 };
      entry.count += 1;
      byBranch.set(s.branch.id, entry);
      byBatch.set(s.graduationYear, (byBatch.get(s.graduationYear) ?? 0) + 1);
    }

    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
    const offerMap = Object.fromEntries(offers.map((o) => [o.status, o._count._all]));

    return {
      driveId,
      title: drive.title,
      status: drive.status,
      vacancies: drive.vacancies,
      totals: {
        applications: total,
        shortlisted: statusMap.SHORTLISTED ?? 0,
        interviewed:
          (statusMap.INTERVIEW_SCHEDULED ?? 0) +
          (statusMap.INTERVIEW_IN_PROGRESS ?? 0) +
          (statusMap.INTERVIEW_PASSED ?? 0),
        offered: offerMap.RELEASED ?? 0,
        accepted: (offerMap.ACCEPTED ?? 0) + (offerMap.JOINED ?? 0),
        joined: offerMap.JOINED ?? 0,
        rejected: statusMap.REJECTED ?? 0,
      },
      funnel: [
        { stage: 'Applied', value: total },
        { stage: 'Shortlisted', value: statusMap.SHORTLISTED ?? 0 },
        { stage: 'Interview', value: statusMap.INTERVIEW_SCHEDULED ?? 0 },
        {
          stage: 'Offered',
          value: (offerMap.RELEASED ?? 0) + (offerMap.ACCEPTED ?? 0) + (offerMap.JOINED ?? 0),
        },
        { stage: 'Joined', value: offerMap.JOINED ?? 0 },
      ],
      byStatus: statusMap,
      byEligibility: Object.fromEntries(
        byEligibility.map((e) => [e.eligibilityStatus, e._count._all]),
      ),
      byBranch: [...byBranch.values()],
      byBatch: [...byBatch.entries()]
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year),
      offers: offerMap,
    };
  }

  async collegeAnalytics(actor: CampusActor, collegeId: string) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role);

    const [students, applications, offers] = await Promise.all([
      this.prisma.collegeStudent.findMany({
        where: { collegeId },
        select: {
          id: true, userId: true, graduationYear: true, status: true,
          branch: {
            select: {
              id: true, name: true, departmentId: true,
              department: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.jobApplication.findMany({
        where: {
          job: { channel: 'CAMPUS' },
          candidate: { campusStudents: { some: { collegeId } } },
        },
        select: { id: true, candidateUserId: true, status: true },
      }),
      this.prisma.placementOffer.findMany({
        where: { application: { candidate: { campusStudents: { some: { collegeId } } } } },
        select: { id: true, status: true, application: { select: { candidateUserId: true } } },
      }),
    ]);

    const placedUserIds = new Set(
      offers
        .filter((o) => o.status === 'ACCEPTED' || o.status === 'JOINED')
        .map((o) => o.application.candidateUserId),
    );

    const appsByUser = new Map<string, number>();
    for (const a of applications) {
      appsByUser.set(a.candidateUserId, (appsByUser.get(a.candidateUserId) ?? 0) + 1);
    }

    const branchMap = new Map<
      string,
      { branch: string; department: string; students: number; placed: number; applications: number }
    >();
    const batchMap = new Map<number, { year: number; students: number; placed: number }>();

    for (const s of students) {
      const b = branchMap.get(s.branch.id) ?? {
        branch: s.branch.name,
        department: s.branch.department.name,
        students: 0, placed: 0, applications: 0,
      };
      b.students += 1;
      b.applications += appsByUser.get(s.userId) ?? 0;
      if (placedUserIds.has(s.userId)) b.placed += 1;
      branchMap.set(s.branch.id, b);

      const y = batchMap.get(s.graduationYear) ?? { year: s.graduationYear, students: 0, placed: 0 };
      y.students += 1;
      if (placedUserIds.has(s.userId)) y.placed += 1;
      batchMap.set(s.graduationYear, y);
    }

    const offerStatus = offers.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      collegeId,
      totals: {
        students: students.length,
        applications: applications.length,
        offers: offers.length,
        placed: placedUserIds.size,
        placementRate: students.length
          ? Math.round((placedUserIds.size / students.length) * 100)
          : 0,
      },
      offerStatus,
      byBranch: [...branchMap.values()].sort((a, b) => b.students - a.students),
      byBatch: [...batchMap.values()].sort((a, b) => a.year - b.year),
    };
  }

  async recruiterOverview(actor: CampusActor) {
    const companyIds = await this.tenant.companyIdsFor(actor.id);
    if (!companyIds.length) {
      return { drives: 0, published: 0, applications: 0, offers: 0, accepted: 0, byStatus: {} };
    }
    const drives = await this.prisma.placementDrive.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true, status: true, jobId: true },
    });
    const driveIds = drives.map((d) => d.id);
    const jobIds = drives.map((d) => d.jobId);

    const [applications, offers, accepted, byStatus] = await Promise.all([
      this.prisma.jobApplication.count({ where: { jobId: { in: jobIds } } }),
      this.prisma.placementOffer.count({ where: { driveId: { in: driveIds } } }),
      this.prisma.placementOffer.count({
        where: { driveId: { in: driveIds }, status: { in: ['ACCEPTED', 'JOINED'] } },
      }),
      this.prisma.placementDrive.groupBy({
        by: ['status'], where: { companyId: { in: companyIds } }, _count: { _all: true },
      }),
    ]);

    return {
      drives: drives.length,
      published: drives.filter((d) => d.status === 'PUBLISHED').length,
      applications,
      offers,
      accepted,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    };
  }
}