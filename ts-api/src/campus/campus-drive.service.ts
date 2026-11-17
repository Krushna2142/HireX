// ts-api/src/campus/campus-drive.service.ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DriveStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CampusActor, CampusTenantService } from './campus-tenant.service';
import {
  BaseEligibilityRule, BranchCriterionInput, EligibilityResult,
  evaluateEligibility, StudentAcademicInput,
} from './campus-eligibility.engine';
import {
  CreateDriveDto, EligibleStudentsDto, SetCriteriaDto,
  SetDriveCollegesDto, SetEligibilityDto, UpdateDriveDto,
} from './dto/campus.dto';

const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
@Injectable()
export class CampusDriveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: CampusTenantService,
  ) {}

  private async resolveCompanyId(actor: CampusActor, explicit?: string): Promise<string> {
    if (explicit) {
      await this.tenant.requireCompanyMember(actor.id, explicit, actor.role);
      return explicit;
    }
    const ids = await this.tenant.companyIdsFor(actor.id);
    if (!ids.length) {
      throw new BadRequestException('Create your company profile before creating a drive.');
    }
    return ids[0];
  }

  // ── Create (DRAFT + linked CAMPUS job) ────────────────────────────────────
  async create(actor: CampusActor, dto: CreateDriveDto) {
    const companyId = await this.resolveCompanyId(actor, dto.companyId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found.');

    if (dto.applicationOpenAt && dto.applicationCloseAt) {
      if (new Date(dto.applicationCloseAt) <= new Date(dto.applicationOpenAt)) {
        throw new BadRequestException('Application close date must be after the open date.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          recruiterUserId: actor.id,
          title: dto.jobRole.trim(),
          description: dto.description,
          companyName: company.name,
          location: dto.location ?? null,
          workMode: dto.workMode ?? 'onsite',
          employmentType: dto.employmentType ?? 'full_time',
          salaryMin: dto.ctcMin !== undefined ? Math.round(dto.ctcMin) : null,
          salaryMax: dto.ctcMax !== undefined ? Math.round(dto.ctcMax) : null,
          salaryCurrency: dto.currency ?? 'INR',
          requiredSkills: dto.requiredSkills ?? [],
          experienceMin: 0,
          industry: company.industry?.[0] ?? null,
          status: 'DRAFT',
          source: 'internal',
          channel: 'CAMPUS',
        },
      });

      return tx.placementDrive.create({
        data: {
          jobId: job.id,
          companyId,
          createdByUserId: actor.id,
          title: dto.title.trim(),
          status: 'DRAFT',
          applicationOpenAt: dto.applicationOpenAt ? new Date(dto.applicationOpenAt) : null,
          applicationCloseAt: dto.applicationCloseAt ? new Date(dto.applicationCloseAt) : null,
          driveDate: dto.driveDate ? new Date(dto.driveDate) : null,
          vacancies: dto.vacancies ?? 1,
          ctcMin: dto.ctcMin ?? null,
          ctcMax: dto.ctcMax ?? null,
          currency: dto.currency ?? 'INR',
          location: dto.location ?? null,
          workMode: dto.workMode ?? 'onsite',
          employmentType: dto.employmentType ?? 'full_time',
          requiredDocuments: dto.requiredDocuments ?? [],
          roundsTemplate: (dto.roundsTemplate ?? []) as Prisma.InputJsonValue,
          eligibility: { create: { combinator: 'AND', rule: {} } },
        },
        include: { job: true, eligibility: true, colleges: true, criteria: true },
      });
    });
  }

  async listMine(actor: CampusActor) {
    const companyIds = await this.tenant.companyIdsFor(actor.id);
    if (!companyIds.length) return [];
    const drives = await this.prisma.placementDrive.findMany({
      where: { companyId: { in: companyIds } },
      include: {
        job: { select: { id: true, title: true, status: true, applicantCount: true } },
        company: { select: { id: true, name: true } },
        colleges: { include: { college: { select: { id: true, name: true } } } },
        _count: { select: { details: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return drives;
  }

  async detail(actor: CampusActor, driveId: string) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    const [applicationCount, statusGroups, eligibilityGroups] = await Promise.all([
      this.prisma.jobApplication.count({ where: { jobId: drive.jobId } }),
      this.prisma.jobApplication.groupBy({
        by: ['status'], where: { jobId: drive.jobId }, _count: { _all: true },
      }),
      this.prisma.campusApplicationDetail.groupBy({
        by: ['eligibilityStatus'], where: { driveId }, _count: { _all: true },
      }),
    ]);
    return {
      drive,
      stats: {
        applicationCount,
        byStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
        byEligibility: Object.fromEntries(eligibilityGroups.map((g) => [g.eligibilityStatus, g._count._all])),
      },
    };
  }

  async update(actor: CampusActor, driveId: string, dto: UpdateDriveDto) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    if (drive.status !== 'DRAFT' && drive.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only draft drives can be edited.');
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.jobRole || dto.description || dto.requiredSkills || dto.location) {
        await tx.job.update({
          where: { id: drive.jobId },
          data: {
            ...(dto.jobRole && { title: dto.jobRole.trim() }),
            ...(dto.description && { description: dto.description }),
            ...(dto.requiredSkills && { requiredSkills: dto.requiredSkills }),
            ...(dto.location !== undefined && { location: dto.location }),
          },
        });
      }
      return tx.placementDrive.update({
        where: { id: driveId },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.employmentType !== undefined && { employmentType: dto.employmentType }),
          ...(dto.workMode !== undefined && { workMode: dto.workMode }),
          ...(dto.ctcMin !== undefined && { ctcMin: dto.ctcMin }),
          ...(dto.ctcMax !== undefined && { ctcMax: dto.ctcMax }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.applicationOpenAt !== undefined && { applicationOpenAt: new Date(dto.applicationOpenAt) }),
          ...(dto.applicationCloseAt !== undefined && { applicationCloseAt: new Date(dto.applicationCloseAt) }),
          ...(dto.driveDate !== undefined && { driveDate: new Date(dto.driveDate) }),
          ...(dto.vacancies !== undefined && { vacancies: dto.vacancies }),
          ...(dto.requiredDocuments !== undefined && { requiredDocuments: dto.requiredDocuments }),
          ...(dto.roundsTemplate !== undefined && { roundsTemplate: dto.roundsTemplate as Prisma.InputJsonValue }),
        },
        include: { job: true, eligibility: true, colleges: true, criteria: true },
      });
    });
  }

  async setColleges(actor: CampusActor, driveId: string, dto: SetDriveCollegesDto) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    if (drive.status === 'COMPLETED' || drive.status === 'CANCELLED') {
      throw new BadRequestException('Cannot change visibility of a closed drive.');
    }

    let targets: Array<{ collegeId: string; scope: Prisma.InputJsonValue }> = [];
    if (dto.allColleges) {
      const colleges = await this.prisma.college.findMany({
        where: { isActive: true }, select: { id: true },
      });
      targets = colleges.map((c) => ({ collegeId: c.id, scope: {} as Prisma.InputJsonValue }));
    } else {
      const list = dto.colleges ?? [];
      if (!list.length) throw new BadRequestException('Select at least one college, or use allColleges.');
      const ids = list.map((c) => c.collegeId);
      const found = await this.prisma.college.count({ where: { id: { in: ids }, isActive: true } });
      if (found !== new Set(ids).size) throw new BadRequestException('One or more colleges are invalid.');
      targets = list.map((c) => ({
        collegeId: c.collegeId,
        scope: (c.scope ?? {}) as Prisma.InputJsonValue,
      }));
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.driveCollege.deleteMany({ where: { driveId } });
      await tx.driveCollege.createMany({ data: targets.map((t) => ({ driveId, ...t })) });
    });

    return this.prisma.driveCollege.findMany({
      where: { driveId },
      include: { college: { select: { id: true, name: true } } },
    });
  }

  async setEligibility(actor: CampusActor, driveId: string, dto: SetEligibilityDto) {
    await this.tenant.requireDriveOwner(driveId, actor);
    return this.prisma.driveEligibility.upsert({
      where: { driveId },
      create: {
        driveId,
        combinator: dto.combinator ?? 'AND',
        rule: dto.rule as Prisma.InputJsonValue,
      },
      update: {
        combinator: dto.combinator ?? 'AND',
        rule: dto.rule as Prisma.InputJsonValue,
      },
    });
  }

  async setCriteria(actor: CampusActor, driveId: string, dto: SetCriteriaDto) {
    await this.tenant.requireDriveOwner(driveId, actor);
    const selectors = dto.criteria.map((c) => c.branchSelector);
    if (new Set(selectors).size !== selectors.length) {
      throw new BadRequestException('Duplicate branchSelector entries.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.driveBranchCriterion.deleteMany({ where: { driveId } });
      if (dto.criteria.length) {
        await tx.driveBranchCriterion.createMany({
          data: dto.criteria.map((c) => ({
            driveId,
            branchSelector: c.branchSelector,
            minCgpa: c.minCgpa ?? null,
            minTenthPct: c.minTenthPct ?? null,
            minTwelfthPct: c.minTwelfthPct ?? null,
            maxActiveBacklogs: c.maxActiveBacklogs ?? null,
            maxHistoricalBacklogs: c.maxHistoricalBacklogs ?? null,
            allowHistorical: c.allowHistorical ?? true,
            custom: json(c.custom ?? []),
          })),
        });
      }
    });
    return this.prisma.driveBranchCriterion.findMany({ where: { driveId } });
  }

  async publish(actor: CampusActor, driveId: string) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    if (drive.status === 'PUBLISHED') return drive;
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(drive.status)) {
      throw new BadRequestException(`A ${drive.status} drive cannot be published.`);
    }
    if (!drive.colleges.length) {
      throw new BadRequestException('Select at least one college before publishing.');
    }
    if (!drive.applicationOpenAt || !drive.applicationCloseAt) {
      throw new BadRequestException('Set the application open and close dates before publishing.');
    }
    if (drive.applicationCloseAt <= new Date()) {
      throw new BadRequestException('Application close date must be in the future.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.placementDrive.update({
        where: { id: driveId },
        data: { status: 'PUBLISHED' },
        include: { colleges: true, eligibility: true, criteria: true },
      });
      await tx.job.update({
        where: { id: drive.jobId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: 'campus.drive.published',
          entityType: 'PlacementDrive',
          entityId: driveId,
          metadata: { colleges: drive.colleges.length } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  }

  async setStatus(actor: CampusActor, driveId: string, status: DriveStatus) {
    const drive = await this.tenant.requireDriveOwner(driveId, actor);
    const allowed: Record<string, DriveStatus[]> = {
      DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
      PENDING_APPROVAL: ['DRAFT', 'CANCELLED'],
      PUBLISHED: ['CLOSED', 'CANCELLED', 'COMPLETED'],
      CLOSED: ['COMPLETED'],
      CANCELLED: [],
      COMPLETED: [],
    };
    if (!allowed[drive.status]?.includes(status)) {
      throw new BadRequestException(`Cannot move drive from ${drive.status} to ${status}.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.placementDrive.update({ where: { id: driveId }, data: { status } });
      if (status === 'CLOSED' || status === 'CANCELLED' || status === 'COMPLETED') {
        await tx.job.update({
          where: { id: drive.jobId },
          data: { status: 'CLOSED', closedAt: new Date() },
        });
      }
      return updated;
    });
  }

  // ── Placement-cell browsing (published + visible only) ────────────────────
  async listForCollege(actor: CampusActor, collegeId: string) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role);
    const driveIds = await this.tenant.driveIdsForCollege(collegeId);
    if (!driveIds.length) return [];
    return this.prisma.placementDrive.findMany({
      where: { id: { in: driveIds }, status: 'PUBLISHED' },
      include: {
        job: { select: { id: true, title: true, description: true, requiredSkills: true } },
        company: { select: { id: true, name: true, logoUrl: true, website: true } },
        eligibility: true,
        criteria: true,
        colleges: { where: { collegeId }, select: { scope: true } },
      },
      orderBy: { applicationCloseAt: 'asc' },
    });
  }

  /** Load a drive + rules and assert the college can see it. */
  async visibleDriveForCollege(driveId: string, collegeId: string) {
    const link = await this.prisma.driveCollege.findUnique({
      where: { driveId_collegeId: { driveId, collegeId } },
      select: { scope: true },
    });
    if (!link) throw new ForbiddenException('This drive is not available to your college.');
    const drive = await this.prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        job: true, company: true, eligibility: true, criteria: true,
      },
    });
    if (!drive || drive.status !== 'PUBLISHED') {
      throw new NotFoundException('Drive not found or not published.');
    }
    return { drive, scope: link.scope };
  }

  toStudentInput(s: {
    id: string; userId: string; collegeId: string; branchId: string;
    graduationYear: number; cgpa: unknown; tenthPct: unknown; twelfthPct: unknown;
    activeBacklogs: number | null; historicalBacklogs: number | null;
    customAcademics: unknown;
    branch?: { name: string; canonicalKey: string | null; departmentId: string } | null;
  }): StudentAcademicInput {
    return {
      collegeStudentId: s.id,
      userId: s.userId,
      collegeId: s.collegeId,
      branchId: s.branchId,
      departmentId: s.branch?.departmentId ?? '',
      canonicalKey: s.branch?.canonicalKey ?? null,
      branchName: s.branch?.name ?? null,
      graduationYear: s.graduationYear,
      cgpa: toNum(s.cgpa),
      tenthPct: toNum(s.tenthPct),
      twelfthPct: toNum(s.twelfthPct),
      activeBacklogs: s.activeBacklogs,
      historicalBacklogs: s.historicalBacklogs,
      customAcademics: (s.customAcademics ?? {}) as Record<string, unknown>,
    };
  }

  evaluateForDrive(
    drive: { eligibility: { rule: unknown; combinator: string } | null; criteria: unknown[] },
    student: StudentAcademicInput,
  ): EligibilityResult {
    const rule = (drive.eligibility?.rule ?? {}) as BaseEligibilityRule;
    const criteria = (drive.criteria ?? []).map((c) => {
      const row = c as Record<string, unknown>;
      return {
        branchSelector: String(row.branchSelector),
        minCgpa: toNum(row.minCgpa),
        minTenthPct: toNum(row.minTenthPct),
        minTwelfthPct: toNum(row.minTwelfthPct),
        maxActiveBacklogs: toNum(row.maxActiveBacklogs),
        maxHistoricalBacklogs: toNum(row.maxHistoricalBacklogs),
        allowHistorical: row.allowHistorical !== false,
        custom: (row.custom ?? []) as never,
      } as BranchCriterionInput;
    });
    return evaluateEligibility({
      student,
      rule,
      combinator: (drive.eligibility?.combinator ?? 'AND') as 'AND' | 'OR',
      criteria,
    });
  }

  /** Eligible / ineligible / needs-info lists with reasons, paginated. */
  async eligibleStudents(
    actor: CampusActor, driveId: string, collegeId: string, query: EligibleStudentsDto,
  ) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role);
    const { drive, scope } = await this.visibleDriveForCollege(driveId, collegeId);

    const students = await this.prisma.collegeStudent.findMany({
      where: {
        collegeId,
        status: 'ACTIVE',
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.graduationYear && { graduationYear: query.graduationYear }),
      },
      include: {
        branch: { select: { id: true, name: true, canonicalKey: true, departmentId: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ graduationYear: 'asc' }, { enrollmentNo: 'asc' }],
    });

    const evaluated = students
      .filter((s) => this.tenant.scopeMatches(scope, s.branchId, s.branch.departmentId))
      .map((s) => ({
        student: s,
        result: this.evaluateForDrive(drive, this.toStudentInput(s)),
      }));

    const summary = {
      total: evaluated.length,
      eligible: evaluated.filter((e) => e.result.status === 'ELIGIBLE').length,
      notEligible: evaluated.filter((e) => e.result.status === 'NOT_ELIGIBLE').length,
      needsInfo: evaluated.filter((e) => e.result.status === 'NEEDS_INFO').length,
    };

    const wanted = query.status && query.status !== 'all' ? query.status : null;
    const filtered = wanted ? evaluated.filter((e) => e.result.status === wanted) : evaluated;

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const slice = filtered.slice((page - 1) * limit, page * limit);

    return {
      driveId,
      collegeId,
      summary,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      students: slice.map((e) => ({
        id: e.student.id,
        userId: e.student.userId,
        name: e.student.user.fullName,
        email: e.student.user.email,
        enrollmentNo: e.student.enrollmentNo,
        branch: e.student.branch.name,
        graduationYear: e.student.graduationYear,
        cgpa: e.student.cgpa,
        status: e.result.status,
        reasons: e.result.reasons,
        missingFields: e.result.missingFields,
        checks: e.result.checks,
      })),
    };
  }
}