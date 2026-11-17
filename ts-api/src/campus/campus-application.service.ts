// ts-api/src/campus/campus-application.service.ts
import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { AtsService } from '../ats/ats.service';
import { RecruiterInterviewsService } from '../interviews/recruiter-interviews.service';
import { CampusActor, CampusTenantService } from './campus-tenant.service';
import { CampusDriveService } from './campus-drive.service';
import { CAMPUS_JOB, CAMPUS_QUEUE } from './campus.constants';
import {
  ApplicantFilterDto, ApplyDriveDto, BulkNotifyDto, BulkStatusDto,
  ScheduleCampusInterviewDto,
} from './dto/campus.dto';

@Injectable()
export class CampusApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: CampusTenantService,
    private readonly drives: CampusDriveService,
    private readonly alerts: AlertsService,
    private readonly ats: AtsService,
    private readonly interviews: RecruiterInterviewsService,
    @InjectQueue(CAMPUS_QUEUE) private readonly queue: Queue,
  ) {}

  // ── Student: eligible drives ──────────────────────────────────────────────
  async listForStudent(userId: string) {
    const student = await this.tenant.requireStudent(userId);
    const driveIds = await this.tenant.driveIdsForCollege(student.collegeId);
    if (!driveIds.length) return [];

    const drives = await this.prisma.placementDrive.findMany({
      where: { id: { in: driveIds }, status: 'PUBLISHED' },
      include: {
        job: { select: { id: true, title: true, description: true, requiredSkills: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
        eligibility: true,
        criteria: true,
        colleges: { where: { collegeId: student.collegeId }, select: { scope: true } },
      },
      orderBy: { applicationCloseAt: 'asc' },
    });

    const input = this.drives.toStudentInput(student);
    const applications = await this.prisma.jobApplication.findMany({
      where: { candidateUserId: userId, jobId: { in: drives.map((d) => d.jobId) } },
      select: { id: true, jobId: true, status: true, appliedAt: true },
    });
    const byJob = new Map(applications.map((a) => [a.jobId, a]));

    return drives
      .filter((d) => this.tenant.scopeMatches(d.colleges[0]?.scope, student.branchId, student.branch.departmentId))
      .map((d) => {
        const result = this.drives.evaluateForDrive(d, input);
        const application = byJob.get(d.jobId) ?? null;
        return {
          id: d.id,
          title: d.title,
          company: d.company,
          jobRole: d.job.title,
          description: d.job.description,
          requiredSkills: d.job.requiredSkills,
          location: d.location,
          workMode: d.workMode,
          employmentType: d.employmentType,
          ctcMin: d.ctcMin,
          ctcMax: d.ctcMax,
          currency: d.currency,
          vacancies: d.vacancies,
          applicationOpenAt: d.applicationOpenAt,
          applicationCloseAt: d.applicationCloseAt,
          driveDate: d.driveDate,
          requiredDocuments: d.requiredDocuments,
          eligibility: {
            status: result.status,
            reasons: result.reasons,
            missingFields: result.missingFields,
            checks: result.checks,
          },
          canApply:
            result.status !== 'NOT_ELIGIBLE' &&
            !application &&
            this.windowOpen(d.applicationOpenAt, d.applicationCloseAt),
          application,
        };
      });
  }

  private windowOpen(open: Date | null, close: Date | null): boolean {
    const now = Date.now();
    if (open && now < open.getTime()) return false;
    if (close && now > close.getTime()) return false;
    return true;
  }

  // ── Student: apply ────────────────────────────────────────────────────────
  async apply(userId: string, driveId: string, dto: ApplyDriveDto) {
    const student = await this.tenant.requireStudent(userId);
    const { drive, scope } = await this.drives.visibleDriveForCollege(driveId, student.collegeId);

    if (!this.tenant.scopeMatches(scope, student.branchId, student.branch.departmentId)) {
      throw new ForbiddenException('Your branch is not eligible for this drive.');
    }
    if (!this.windowOpen(drive.applicationOpenAt, drive.applicationCloseAt)) {
      throw new BadRequestException('The application window for this drive is not open.');
    }

    const result = this.drives.evaluateForDrive(drive, this.drives.toStudentInput(student));
    if (result.status === 'NOT_ELIGIBLE') {
      throw new ForbiddenException({
        message: 'You do not meet the eligibility criteria for this drive.',
        reasons: result.reasons,
      });
    }

    let resumeId = dto.resumeId ?? null;
    if (!resumeId) {
      const profile = await this.prisma.jobseekerProfile.findUnique({
        where: { userId }, select: { activeResumeId: true },
      });
      resumeId = profile?.activeResumeId ?? null;
    }
    if (resumeId) {
      const owned = await this.prisma.resume.findFirst({
        where: { id: resumeId, userId }, select: { id: true },
      });
      if (!owned) throw new BadRequestException('Selected resume does not belong to you.');
    }

    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.jobApplication.create({
          data: {
            jobId: drive.jobId,
            candidateUserId: userId,
            resumeId,
            coverLetter: dto.coverLetter ?? null,
            status: 'APPLIED',
          },
        });
        await tx.campusApplicationDetail.create({
          data: {
            applicationId: created.id,
            driveId,
            eligibilityStatus: result.status,
            eligibilitySnapshot: result as unknown as Prisma.InputJsonValue,
            missingFields: result.missingFields,
          },
        });
        await tx.candidateStatusEvent.create({
          data: {
            applicationId: created.id,
            fromStatus: null,
            toStatus: 'APPLIED',
            changedByUserId: userId,
            reason: 'Campus drive application submitted',
            metadata: { driveId, eligibility: result.status } as Prisma.InputJsonValue,
          },
        });
        await tx.job.update({
          where: { id: drive.jobId },
          data: { applicantCount: { increment: 1 } },
        });
        return created;
      });

      await this.alerts.createBulkAlerts([
        {
          userId,
          type: 'application_update',
          title: 'Campus application submitted',
          message: `You applied to ${drive.title} at ${drive.company?.name ?? 'the company'}.`,
          metadata: { driveId, applicationId: application.id },
        },
        {
          userId: drive.createdByUserId,
          type: 'new_applicant',
          title: 'New campus application',
          message: `${student.user?.fullName ?? 'A student'} applied to ${drive.title}.`,
          metadata: { driveId, applicationId: application.id },
        },
      ]).catch(() => undefined);

      if (resumeId) {
        await this.ats.enqueueSingleApplication(application.id, drive.createdByUserId).catch(() => undefined);
      }

      return { applicationId: application.id, eligibility: result.status, reasons: result.reasons };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('You have already applied to this drive.');
      }
      throw e;
    }
  }

  async myApplications(userId: string) {
    const rows = await this.prisma.jobApplication.findMany({
      where: { candidateUserId: userId, job: { channel: 'CAMPUS' } },
      include: {
        job: {
          select: {
            id: true, title: true, companyName: true,
            campusDrive: {
              select: { id: true, title: true, driveDate: true, status: true, roundsTemplate: true },
            },
          },
        },
        campusDetail: true,
        campusOffer: true,
        statusEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
        interviews: {
          select: {
            id: true, status: true, scheduledStartAt: true,
            rounds: {
              select: {
                id: true, roundNumber: true, roundType: true,
                scheduledAt: true, durationMins: true, result: true, meetingJoinUrl: true,
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
    return rows;
  }

  // ── Recruiter: applicants ─────────────────────────────────────────────────
  async listApplicants(actor: CampusActor, driveId: string, filter: ApplicantFilterDto) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 25;

    const studentWhere: Prisma.CollegeStudentWhereInput = {
      ...(filter.branchId && { branchId: filter.branchId }),
      ...(filter.graduationYear && { graduationYear: filter.graduationYear }),
      ...(filter.minCgpa !== undefined && { cgpa: { gte: filter.minCgpa } }),
    };

    const where: Prisma.JobApplicationWhereInput = {
      jobId: drive.jobId,
      ...(filter.status && { status: filter.status as ApplicationStatus }),
      campusDetail: {
        driveId,
        ...(filter.eligibilityStatus && { eligibilityStatus: filter.eligibilityStatus as never }),
        ...(filter.roundKey && { currentRoundKey: filter.roundKey }),
      },
      candidate: {
        campusStudents: { some: studentWhere },
      },
      ...(filter.search && {
        OR: [
          { candidate: { fullName: { contains: filter.search, mode: 'insensitive' } } },
          { candidate: { email: { contains: filter.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.jobApplication.count({ where }),
      this.prisma.jobApplication.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true, fullName: true, email: true, avatarUrl: true,
              campusStudents: {
                select: {
                  id: true, enrollmentNo: true, graduationYear: true, cgpa: true,
                  activeBacklogs: true, historicalBacklogs: true,
                  branch: { select: { id: true, name: true, code: true } },
                  college: { select: { id: true, name: true } },
                },
                take: 1,
              },
            },
          },
          resume: { select: { id: true, originalFileName: true, analysisStatus: true } },
          campusDetail: true,
          campusOffer: true,
          statusEvents: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
        orderBy: [{ atsScore: 'desc' }, { appliedAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { driveId, total, page, limit, totalPages: Math.ceil(total / limit) || 1, applicants: rows };
  }

  async bulkStatus(actor: CampusActor, driveId: string, dto: BulkStatusDto) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    if (!dto.applicationIds?.length) throw new BadRequestException('No applications selected.');
    if (dto.applicationIds.length > 10_000) throw new BadRequestException('Max 10,000 per batch.');

    const batch = await this.prisma.campusBulkBatch.create({
      data: {
        type: 'BULK_STATUS',
        driveId,
        companyId: drive.companyId,
        createdByUserId: actor.id,
        total: dto.applicationIds.length,
        idempotencyKey: dto.idempotencyKey ?? null,
        payload: {
          applicationIds: dto.applicationIds,
          status: dto.status,
          reason: dto.reason ?? null,
          notify: dto.notify !== false,
          jobId: drive.jobId,
        } as Prisma.InputJsonValue,
        items: {
          create: dto.applicationIds.map((id, index) => ({ rowNumber: index + 1, refId: id })),
        },
      },
    });

    await this.queue.add(
      CAMPUS_JOB.BULK_STATUS,
      { batchId: batch.id, actorUserId: actor.id, actorRole: actor.role },
      {
        jobId: `campus-status-${batch.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86_400, count: 5000 },
        removeOnFail: { age: 604_800, count: 5000 },
      },
    );

    return { batchId: batch.id, total: batch.total, status: batch.status };
  }

  async bulkNotify(actor: CampusActor, driveId: string, dto: BulkNotifyDto) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    if (!dto.applicationIds?.length) throw new BadRequestException('No applications selected.');

    const batch = await this.prisma.campusBulkBatch.create({
      data: {
        type: 'BULK_NOTIFY',
        driveId,
        companyId: drive.companyId,
        createdByUserId: actor.id,
        total: dto.applicationIds.length,
        idempotencyKey: dto.idempotencyKey ?? null,
        payload: {
          applicationIds: dto.applicationIds,
          title: dto.title,
          message: dto.message,
          jobId: drive.jobId,
        } as Prisma.InputJsonValue,
        items: {
          create: dto.applicationIds.map((id, index) => ({ rowNumber: index + 1, refId: id })),
        },
      },
    });

    await this.queue.add(
      CAMPUS_JOB.BULK_NOTIFY,
      { batchId: batch.id, actorUserId: actor.id, actorRole: actor.role },
      { jobId: `campus-notify-${batch.id}`, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    return { batchId: batch.id, total: batch.total, status: batch.status };
  }

  async exportApplicants(actor: CampusActor, driveId: string) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    const batch = await this.prisma.campusBulkBatch.create({
      data: {
        type: 'EXPORT',
        driveId,
        companyId: drive.companyId,
        createdByUserId: actor.id,
        payload: { jobId: drive.jobId, driveTitle: drive.title } as Prisma.InputJsonValue,
      },
    });
    await this.queue.add(
      CAMPUS_JOB.EXPORT,
      { batchId: batch.id, actorUserId: actor.id, actorRole: actor.role },
      { jobId: `campus-export-${batch.id}`, attempts: 2, backoff: { type: 'fixed', delay: 5000 } },
    );
    return { batchId: batch.id, status: batch.status };
  }

  // ── Recruiter: interview scheduling (reuses existing module) ──────────────
  async scheduleInterview(
    actor: CampusActor, driveId: string, applicationId: string, dto: ScheduleCampusInterviewDto,
  ) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    const application = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, jobId: drive.jobId },
      select: { id: true, status: true },
    });
    if (!application) throw new NotFoundException('Application not found in this drive.');
    if (!['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_PASSED', 'FINAL_REVIEW']
      .includes(application.status)) {
      throw new BadRequestException('Shortlist the candidate before scheduling an interview.');
    }

    const interview = await this.interviews.initInterview(applicationId, actor.id);
    const round = await this.interviews.scheduleRound(interview.id, actor.id, {
      roundType: dto.roundType,
      scheduledAt: dto.scheduledAt,
      durationMins: dto.durationMins ?? 45,
      mode: dto.mode ?? 'video',
      interviewerId: dto.interviewerId,
    });

    await this.prisma.campusApplicationDetail.updateMany({
      where: { applicationId },
      data: { currentRoundKey: `${dto.roundType}-${round.roundNumber}` },
    });

    return { interviewId: interview.id, round };
  }
}