// ts-api/src/campus/campus-tenant.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CampusActor {
  id: string;
  role: string;
  email?: string;
}

export interface DriveScope {
  departmentIds?: string[];
  branchIds?: string[];
}

@Injectable()
export class CampusTenantService {
  constructor(private readonly prisma: PrismaService) {}

  isPlatformAdmin(role?: string): boolean {
    return role === 'admin' || role === 'super_admin';
  }

  async requireCompanyMember(
    userId: string,
    companyId: string,
    role?: string,
  ): Promise<{ companyId: string; role: string }> {
    if (this.isPlatformAdmin(role)) return { companyId, role: 'ADMIN' };
    const member = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      select: { companyId: true, role: true },
    });
    if (!member) {
      throw new ForbiddenException('You do not have access to this company.');
    }
    return member;
  }

  async requireCollegeMember(
    userId: string,
    collegeId: string,
    role?: string,
    allowed?: string[],
  ): Promise<{ collegeId: string; role: string }> {
    if (this.isPlatformAdmin(role)) return { collegeId, role: 'ADMIN' };
    const member = await this.prisma.collegeMember.findUnique({
      where: { collegeId_userId: { collegeId, userId } },
      select: { collegeId: true, role: true },
    });
    if (!member) {
      throw new ForbiddenException('You do not have access to this college.');
    }
    if (allowed?.length && !allowed.includes(member.role)) {
      throw new ForbiddenException('Your college role cannot perform this action.');
    }
    return member;
  }

  async companyIdsFor(userId: string): Promise<string[]> {
    const rows = await this.prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    return rows.map((r) => r.companyId);
  }

  async collegeIdsFor(userId: string): Promise<string[]> {
    const rows = await this.prisma.collegeMember.findMany({
      where: { userId },
      select: { collegeId: true },
    });
    return rows.map((r) => r.collegeId);
  }

  async requireDriveOwner(driveId: string, actor: CampusActor) {
    const drive = await this.prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        job: true,
        company: true,
        colleges: true,
        eligibility: true,
        criteria: true,
      },
    });
    if (!drive) throw new NotFoundException('Campus drive not found.');
    await this.requireCompanyMember(actor.id, drive.companyId, actor.role);
    return drive;
  }

  /** Student record for the signed-in user. Includes user + branch.department. */
  async requireStudent(userId: string) {
    const student = await this.prisma.collegeStudent.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        branch: { include: { department: true } },
        college: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!student) {
      throw new NotFoundException(
        'No student profile is linked to your account. Contact your placement cell.',
      );
    }
    return student;
  }

  scopeMatches(
    scope: unknown,
    branchId: string,
    departmentId: string | null,
  ): boolean {
    const s = (scope ?? {}) as DriveScope;
    const branches = Array.isArray(s.branchIds) ? s.branchIds : [];
    const departments = Array.isArray(s.departmentIds) ? s.departmentIds : [];
    if (branches.length === 0 && departments.length === 0) return true;
    if (branches.includes(branchId)) return true;
    if (departmentId && departments.includes(departmentId)) return true;
    return false;
  }

  async driveIdsForCollege(collegeId: string): Promise<string[]> {
    const rows = await this.prisma.driveCollege.findMany({
      where: { collegeId },
      select: { driveId: true },
    });
    return rows.map((r) => r.driveId);
  }

  async requireApplicationOwner(applicationId: string, actor: CampusActor) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { campusDrive: true } },
        campusDetail: true,
        candidate: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!application?.job?.campusDrive) {
      throw new NotFoundException('Campus application not found.');
    }
    await this.requireCompanyMember(
      actor.id,
      application.job.campusDrive.companyId,
      actor.role,
    );
    return application;
  }
}