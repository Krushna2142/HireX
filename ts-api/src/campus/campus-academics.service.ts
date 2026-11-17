// ts-api/src/campus/campus-academics.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CollegeRole, Prisma, ProgramLevel, StudentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CampusActor, CampusTenantService } from './campus-tenant.service';
import { CAMPUS_JOB, CAMPUS_QUEUE, COLLEGE_MANAGERS } from './campus.constants';
import {
  CreateBranchDto, CreateCampusDto, CreateCollegeDto, CreateCompanyDto,
  CreateDepartmentDto, ImportStudentsDto, StudentFilterDto, UpdateBranchDto,
} from './dto/campus.dto';

const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

@Injectable()
export class CampusAcademicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: CampusTenantService,
    @InjectQueue(CAMPUS_QUEUE) private readonly queue: Queue,
  ) {}

  // ── Company ───────────────────────────────────────────────────────────────
    async createCompany(actor: CampusActor, dto: CreateCompanyDto) {
    let name = (dto.name ?? '').trim();
    if (!name) {
      const profile = await this.prisma.recruiterProfile.findUnique({
        where: { userId: actor.id },
        select: { companyName: true },
      });
      name = (profile?.companyName ?? '').trim();
    }
    if (!name) {
      throw new BadRequestException(
        'Company name is required. Add it here or in your recruiter profile.',
      );
    }

    const base = slugify(name) || 'company';
    let slug = base;
    for (let i = 1; await this.prisma.company.findUnique({ where: { slug } }); i += 1) {
      slug = `${base}-${i}`;
    }

    return this.prisma.company.create({
      data: {
        name,
        slug,
        website: dto.website ?? null,
        logoUrl: dto.logoUrl ?? null,
        description: dto.description ?? null,
        location: dto.location ?? null,
        size: dto.size ?? null,
        industry: dto.industry ?? [],
        createdById: actor.id,
        members: { create: { userId: actor.id, role: 'OWNER' } },
      },
      include: { members: true },
    });
  }
  
  async myCompanies(actor: CampusActor) {
    const ids = await this.tenant.companyIdsFor(actor.id);
    return this.prisma.company.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { drives: true, members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── College ───────────────────────────────────────────────────────────────
  async createCollege(actor: CampusActor, dto: CreateCollegeDto) {
    const base = slugify(dto.name);
    let slug = base;
    for (let i = 1; await this.prisma.college.findUnique({ where: { slug } }); i += 1) {
      slug = `${base}-${i}`;
    }
    try {
      return await this.prisma.college.create({
        data: {
          name: dto.name.trim(),
          slug,
          code: dto.code?.trim() || null,
          city: dto.city ?? null,
          state: dto.state ?? null,
          country: dto.country ?? 'India',
          website: dto.website ?? null,
          createdById: actor.id,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('College code already exists.');
      }
      throw e;
    }
  }

  async listColleges() {
    return this.prisma.college.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, code: true, city: true, state: true },
      orderBy: { name: 'asc' },
    });
  }

  async myColleges(actor: CampusActor) {
    const ids = await this.tenant.collegeIdsFor(actor.id);
    return this.prisma.college.findMany({
      where: { id: { in: ids } },
      include: {
        members: { where: { userId: actor.id }, select: { role: true } },
        _count: { select: { students: true, branches: true, departments: true } },
      },
    });
  }

  async addCollegeMember(
    actor: CampusActor, collegeId: string, userId: string, role: CollegeRole,
  ) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role, ['COLLEGE_ADMIN']);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found.');
    return this.prisma.collegeMember.upsert({
      where: { collegeId_userId: { collegeId, userId } },
      create: { collegeId, userId, role },
      update: { role },
    });
  }

  async createCampus(actor: CampusActor, collegeId: string, dto: CreateCampusDto) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role, COLLEGE_MANAGERS);
    return this.prisma.campus.create({
      data: { collegeId, name: dto.name.trim(), city: dto.city ?? null },
    });
  }

  async createDepartment(actor: CampusActor, collegeId: string, dto: CreateDepartmentDto) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role, COLLEGE_MANAGERS);
    if (dto.campusId) {
      const campus = await this.prisma.campus.findFirst({
        where: { id: dto.campusId, collegeId }, select: { id: true },
      });
      if (!campus) throw new BadRequestException('Campus does not belong to this college.');
    }
    try {
      return await this.prisma.department.create({
        data: {
          collegeId,
          campusId: dto.campusId ?? null,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Department code already exists in this college.');
      }
      throw e;
    }
  }

  async createBranch(actor: CampusActor, collegeId: string, dto: CreateBranchDto) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role, COLLEGE_MANAGERS);
    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, collegeId }, select: { id: true },
    });
    if (!department) throw new BadRequestException('Department does not belong to this college.');

    try {
      return await this.prisma.branch.create({
        data: {
          collegeId,
          departmentId: dto.departmentId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          programLevel: (dto.programLevel ?? 'UG') as ProgramLevel,
          canonicalKey: dto.canonicalKey?.trim() || null,
          aliases: dto.aliases?.length
            ? { create: dto.aliases.map((alias) => ({ alias: alias.trim() })) }
            : undefined,
        },
        include: { aliases: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Branch code already exists in this department.');
      }
      throw e;
    }
  }

  async updateBranch(actor: CampusActor, branchId: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId }, select: { id: true, collegeId: true },
    });
    if (!branch) throw new NotFoundException('Branch not found.');
    await this.tenant.requireCollegeMember(actor.id, branch.collegeId, actor.role, COLLEGE_MANAGERS);

    return this.prisma.$transaction(async (tx) => {
      if (dto.aliases) {
        await tx.branchAlias.deleteMany({ where: { branchId } });
        if (dto.aliases.length) {
          await tx.branchAlias.createMany({
            data: dto.aliases.map((alias) => ({ branchId, alias: alias.trim() })),
            skipDuplicates: true,
          });
        }
      }
      return tx.branch.update({
        where: { id: branchId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
          ...(dto.programLevel !== undefined && { programLevel: dto.programLevel as ProgramLevel }),
          ...(dto.canonicalKey !== undefined && { canonicalKey: dto.canonicalKey?.trim() || null }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        include: { aliases: true },
      });
    });
  }

  async academicTree(actor: CampusActor, collegeId: string) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role);
    const [college, campuses, departments, branches] = await Promise.all([
      this.prisma.college.findUnique({ where: { id: collegeId } }),
      this.prisma.campus.findMany({ where: { collegeId }, orderBy: { name: 'asc' } }),
      this.prisma.department.findMany({ where: { collegeId }, orderBy: { name: 'asc' } }),
      this.prisma.branch.findMany({
        where: { collegeId },
        include: { aliases: true, _count: { select: { students: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);
    if (!college) throw new NotFoundException('College not found.');
    return { college, campuses, departments, branches };
  }

  async branchCatalogue() {
    return this.prisma.branch.findMany({
      where: { isActive: true, college: { isActive: true } },
      select: {
        id: true, name: true, code: true, programLevel: true, canonicalKey: true,
        collegeId: true, departmentId: true,
        college: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── Students ──────────────────────────────────────────────────────────────
  async listStudents(actor: CampusActor, collegeId: string, filter: StudentFilterDto) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 25;

    const where: Prisma.CollegeStudentWhereInput = {
      collegeId,
      ...(filter.branchId && { branchId: filter.branchId }),
      ...(filter.departmentId && { branch: { departmentId: filter.departmentId } }),
      ...(filter.graduationYear && { graduationYear: filter.graduationYear }),
      ...(filter.status && { status: filter.status as StudentStatus }),
      ...(filter.maxActiveBacklogs !== undefined && {
        activeBacklogs: { lte: filter.maxActiveBacklogs },
      }),
      ...(filter.minCgpa !== undefined || filter.maxCgpa !== undefined
        ? {
            cgpa: {
              ...(filter.minCgpa !== undefined && { gte: filter.minCgpa }),
              ...(filter.maxCgpa !== undefined && { lte: filter.maxCgpa }),
            },
          }
        : {}),
      ...(filter.search && {
        OR: [
          { enrollmentNo: { contains: filter.search, mode: 'insensitive' } },
          { user: { fullName: { contains: filter.search, mode: 'insensitive' } } },
          { user: { email: { contains: filter.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.collegeStudent.count({ where }),
      this.prisma.collegeStudent.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          branch: { select: { id: true, name: true, code: true, departmentId: true } },
        },
        orderBy: [{ graduationYear: 'asc' }, { enrollmentNo: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, students: rows };
  }

  async importStudents(actor: CampusActor, collegeId: string, dto: ImportStudentsDto) {
    await this.tenant.requireCollegeMember(actor.id, collegeId, actor.role, COLLEGE_MANAGERS);
    if (!dto.rows?.length) throw new BadRequestException('No student rows supplied.');
    if (dto.rows.length > 10_000) {
      throw new BadRequestException('Import limit is 10,000 rows per batch.');
    }

    const branchIds = [...new Set(dto.rows.map((r) => r.branchId))];
    const valid = await this.prisma.branch.count({ where: { id: { in: branchIds }, collegeId } });
    if (valid !== branchIds.length) {
      throw new BadRequestException('One or more branches do not belong to this college.');
    }

    const batch = await this.prisma.campusBulkBatch.create({
      data: {
        type: 'IMPORT_STUDENTS',
        collegeId,
        createdByUserId: actor.id,
        total: dto.rows.length,
        idempotencyKey: dto.idempotencyKey ?? null,
        payload: json({ rows: dto.rows }),
        items: {
          create: dto.rows.map((row, index) => ({
            rowNumber: index + 1,
            refId: row.email,
          })),
        },
      },
    });

    await this.queue.add(
      CAMPUS_JOB.IMPORT_STUDENTS,
      { batchId: batch.id, actorUserId: actor.id, actorRole: actor.role },
      {
        jobId: `campus-import-${batch.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86_400, count: 5000 },
        removeOnFail: { age: 604_800, count: 5000 },
      },
    );

    return { batchId: batch.id, total: batch.total, status: batch.status };
  }

  async batchStatus(actor: CampusActor, batchId: string) {
    const batch = await this.prisma.campusBulkBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch not found.');

    if (batch.companyId) {
      await this.tenant.requireCompanyMember(actor.id, batch.companyId, actor.role);
    } else if (batch.collegeId) {
      await this.tenant.requireCollegeMember(actor.id, batch.collegeId, actor.role);
    } else if (batch.createdByUserId !== actor.id && !this.tenant.isPlatformAdmin(actor.role)) {
      throw new ForbiddenException('Not your batch.');
    }

    const done = batch.processed + batch.failed;
    return {
      ...batch,
      progress: batch.total > 0 ? Math.round((done / batch.total) * 100) : 0,
    };
  }
}