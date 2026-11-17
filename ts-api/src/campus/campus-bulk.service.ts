// ts-api/src/campus/campus-bulk.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { getSupabaseServiceClient } from '../lib/supabase';
import { BULK_CHUNK_SIZE, CAMPUS_EXPORT_BUCKET } from './campus.constants';

type ItemResult = { rowNumber: number; ok: boolean; error?: string; refId?: string };

@Injectable()
export class CampusBulkService {
  private readonly logger = new Logger(CampusBulkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  private chunk<T>(rows: T[], size = BULK_CHUNK_SIZE): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
  }

  private async start(batchId: string) {
    await this.prisma.campusBulkBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING', startedAt: new Date(), error: null },
    });
  }

  private async progress(batchId: string, processed: number, failed: number) {
    await this.prisma.campusBulkBatch.update({
      where: { id: batchId },
      data: { processed, failed },
    });
  }

  private async finish(batchId: string, processed: number, failed: number, result: unknown) {
    await this.prisma.campusBulkBatch.update({
      where: { id: batchId },
      data: {
        processed,
        failed,
        status: failed > 0 && processed === 0 ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
        result: result as Prisma.InputJsonValue,
      },
    });
  }

  private async fail(batchId: string, error: unknown) {
    await this.prisma.campusBulkBatch.update({
      where: { id: batchId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
      },
    });
  }

  private async markItem(batchId: string, r: ItemResult) {
    await this.prisma.campusBulkBatchItem.updateMany({
      where: { batchId, rowNumber: r.rowNumber },
      data: {
        status: r.ok ? 'OK' : 'FAILED',
        error: r.error?.slice(0, 500) ?? null,
        ...(r.refId && { refId: r.refId }),
      },
    });
  }

  // ── IMPORT_STUDENTS ───────────────────────────────────────────────────────
  async importStudents(batchId: string) {
    const batch = await this.prisma.campusBulkBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status === 'COMPLETED') return;
    if (!batch.collegeId) throw new Error('Import batch has no college.');

    const rows = ((batch.payload as Record<string, unknown>)?.rows ?? []) as Array<Record<string, unknown>>;
    await this.start(batchId);

    let processed = 0;
    let failed = 0;
    const errors: ItemResult[] = [];

    for (const [chunkIndex, part] of this.chunk(rows).entries()) {
      for (const [i, row] of part.entries()) {
        const rowNumber = chunkIndex * BULK_CHUNK_SIZE + i + 1;
        try {
          const email = String(row.email ?? '').trim().toLowerCase();
          if (!email || !email.includes('@')) throw new Error('Invalid email');

          const user = await this.prisma.user.upsert({
            where: { email },
            create: {
              email,
              fullName: (row.fullName as string) ?? null,
              role: 'JOBSEEKER',
              emailVerified: false,
              jobseekerProfile: { create: {} },
            },
            update: { ...(row.fullName ? { fullName: row.fullName as string } : {}) },
            select: { id: true },
          });

          await this.prisma.collegeStudent.upsert({
            where: {
              collegeId_enrollmentNo: {
                collegeId: batch.collegeId,
                enrollmentNo: String(row.enrollmentNo),
              },
            },
            create: {
              userId: user.id,
              collegeId: batch.collegeId,
              branchId: String(row.branchId),
              campusId: (row.campusId as string) ?? null,
              enrollmentNo: String(row.enrollmentNo),
              graduationYear: Number(row.graduationYear),
              cgpa: (row.cgpa as number) ?? null,
              tenthPct: (row.tenthPct as number) ?? null,
              twelfthPct: (row.twelfthPct as number) ?? null,
              activeBacklogs: (row.activeBacklogs as number) ?? null,
              historicalBacklogs: (row.historicalBacklogs as number) ?? null,
              customAcademics: (row.customAcademics ?? {}) as Prisma.InputJsonValue,
            },
            update: {
              branchId: String(row.branchId),
              graduationYear: Number(row.graduationYear),
              cgpa: (row.cgpa as number) ?? null,
              tenthPct: (row.tenthPct as number) ?? null,
              twelfthPct: (row.twelfthPct as number) ?? null,
              activeBacklogs: (row.activeBacklogs as number) ?? null,
              historicalBacklogs: (row.historicalBacklogs as number) ?? null,
              customAcademics: (row.customAcademics ?? {}) as Prisma.InputJsonValue,
            },
          });

          processed += 1;
          await this.markItem(batchId, { rowNumber, ok: true, refId: user.id });
        } catch (e) {
          failed += 1;
          const message = e instanceof Error ? e.message : String(e);
          errors.push({ rowNumber, ok: false, error: message });
          await this.markItem(batchId, { rowNumber, ok: false, error: message });
        }
      }
      await this.progress(batchId, processed, failed);
    }

    await this.finish(batchId, processed, failed, { errors: errors.slice(0, 200) });
    this.logger.log(`[campus-import] batch=${batchId} ok=${processed} failed=${failed}`);
  }

  // ── BULK_STATUS ───────────────────────────────────────────────────────────
  async bulkStatus(batchId: string, actorUserId: string) {
    const batch = await this.prisma.campusBulkBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status === 'COMPLETED') return;
    const payload = (batch.payload ?? {}) as Record<string, unknown>;
    const ids = (payload.applicationIds ?? []) as string[];
    const status = String(payload.status) as ApplicationStatus;
    const jobId = String(payload.jobId);
    const notify = payload.notify !== false;

    await this.start(batchId);
    let processed = 0;
    let failed = 0;

    for (const [chunkIndex, part] of this.chunk(ids).entries()) {
      const apps = await this.prisma.jobApplication.findMany({
        where: { id: { in: part }, jobId },
        select: { id: true, status: true, candidateUserId: true },
      });
      const found = new Map(apps.map((a) => [a.id, a]));

      for (const [i, id] of part.entries()) {
        const rowNumber = chunkIndex * BULK_CHUNK_SIZE + i + 1;
        const app = found.get(id);
        if (!app) {
          failed += 1;
          await this.markItem(batchId, { rowNumber, ok: false, error: 'Application not in this drive' });
          continue;
        }
        if (app.status === status) {
          processed += 1;
          await this.markItem(batchId, { rowNumber, ok: true });
          continue;
        }
        try {
          await this.prisma.$transaction([
            this.prisma.jobApplication.update({
              where: { id },
              data: { status, lastStatusChangedAt: new Date() },
            }),
            this.prisma.candidateStatusEvent.create({
              data: {
                applicationId: id,
                fromStatus: app.status,
                toStatus: status,
                changedByUserId: actorUserId,
                reason: (payload.reason as string) ?? 'Campus bulk action',
                metadata: { batchId, source: 'CAMPUS_BULK' } as Prisma.InputJsonValue,
              },
            }),
          ]);
          if (notify) {
            await this.alerts.createAlert({
              userId: app.candidateUserId,
              type: 'application_update',
              title: 'Application updated',
              message: `Your campus application status is now ${status.replace(/_/g, ' ').toLowerCase()}.`,
              metadata: { applicationId: id, driveId: batch.driveId, status },
            }).catch(() => undefined);
          }
          processed += 1;
          await this.markItem(batchId, { rowNumber, ok: true });
        } catch (e) {
          failed += 1;
          await this.markItem(batchId, {
            rowNumber, ok: false, error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      await this.progress(batchId, processed, failed);
    }

    await this.finish(batchId, processed, failed, { status });
  }

  // ── BULK_NOTIFY ───────────────────────────────────────────────────────────
  async bulkNotify(batchId: string) {
    const batch = await this.prisma.campusBulkBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status === 'COMPLETED') return;
    const payload = (batch.payload ?? {}) as Record<string, unknown>;
    const ids = (payload.applicationIds ?? []) as string[];
    const jobId = String(payload.jobId);

    await this.start(batchId);
    let processed = 0;
    let failed = 0;

    for (const [chunkIndex, part] of this.chunk(ids).entries()) {
      const apps = await this.prisma.jobApplication.findMany({
        where: { id: { in: part }, jobId },
        select: { id: true, candidateUserId: true },
      });
      const found = new Map(apps.map((a) => [a.id, a]));
      for (const [i, id] of part.entries()) {
        const rowNumber = chunkIndex * BULK_CHUNK_SIZE + i + 1;
        const app = found.get(id);
        if (!app) {
          failed += 1;
          await this.markItem(batchId, { rowNumber, ok: false, error: 'Application not in this drive' });
          continue;
        }
        try {
          await this.alerts.createAlert({
            userId: app.candidateUserId,
            type: 'application_update',
            title: String(payload.title ?? 'Campus drive update'),
            message: String(payload.message ?? ''),
            metadata: { driveId: batch.driveId, applicationId: id },
          });
          processed += 1;
          await this.markItem(batchId, { rowNumber, ok: true });
        } catch (e) {
          failed += 1;
          await this.markItem(batchId, { rowNumber, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      await this.progress(batchId, processed, failed);
    }
    await this.finish(batchId, processed, failed, {});
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────
  async exportApplicants(batchId: string) {
    const batch = await this.prisma.campusBulkBatch.findUnique({ where: { id: batchId } });
    if (!batch || batch.status === 'COMPLETED') return;
    const payload = (batch.payload ?? {}) as Record<string, unknown>;
    const jobId = String(payload.jobId);

    await this.start(batchId);
    try {
      const rows = await this.prisma.jobApplication.findMany({
        where: { jobId },
        include: {
          candidate: {
            select: {
              fullName: true, email: true,
              campusStudents: {
                select: {
                  enrollmentNo: true, graduationYear: true, cgpa: true,
                  activeBacklogs: true, historicalBacklogs: true,
                  branch: { select: { name: true } },
                  college: { select: { name: true } },
                },
                take: 1,
              },
            },
          },
          campusDetail: { select: { eligibilityStatus: true, currentRoundKey: true } },
          campusOffer: { select: { status: true, ctc: true } },
        },
        orderBy: { appliedAt: 'asc' },
      });

      const header = [
        'application_id', 'name', 'email', 'college', 'branch', 'enrollment_no',
        'graduation_year', 'cgpa', 'active_backlogs', 'historical_backlogs',
        'eligibility', 'status', 'ats_score', 'round', 'offer_status', 'offer_ctc', 'applied_at',
      ];
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [header.join(',')];
      for (const r of rows) {
        const s = r.candidate.campusStudents[0];
        lines.push([
          r.id, r.candidate.fullName, r.candidate.email, s?.college?.name, s?.branch?.name,
          s?.enrollmentNo, s?.graduationYear, s?.cgpa, s?.activeBacklogs, s?.historicalBacklogs,
          r.campusDetail?.eligibilityStatus, r.status, r.atsScore, r.campusDetail?.currentRoundKey,
          r.campusOffer?.status, r.campusOffer?.ctc, r.appliedAt.toISOString(),
        ].map(esc).join(','));
      }
      const csv = lines.join('\n');

      let downloadUrl: string | null = null;
      let storageError: string | null = null;
      try {
        const path = `${batch.driveId}/${batch.id}.csv`;
        const client = getSupabaseServiceClient();
        const { error } = await client.storage
          .from(CAMPUS_EXPORT_BUCKET)
          .upload(path, Buffer.from(csv, 'utf8'), { contentType: 'text/csv', upsert: true });
        if (error) throw new Error(error.message);
        const signed = await client.storage.from(CAMPUS_EXPORT_BUCKET).createSignedUrl(path, 3600);
        downloadUrl = signed.data?.signedUrl ?? null;
      } catch (e) {
        storageError = e instanceof Error ? e.message : String(e);
        this.logger.warn(`[campus-export] storage unavailable: ${storageError}`);
      }

      await this.prisma.campusBulkBatch.update({ where: { id: batchId }, data: { total: rows.length } });
      await this.finish(batchId, rows.length, 0, {
        rowCount: rows.length,
        downloadUrl,
        storageError,
        csv: downloadUrl ? undefined : csv.slice(0, 200_000),
      });
    } catch (e) {
      await this.fail(batchId, e);
      throw e;
    }
  }
}