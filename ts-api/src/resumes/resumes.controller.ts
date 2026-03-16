/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/resumes/resumes.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { ResumesService }  from './resumes.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 5 MB

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  private readonly logger = new Logger(ResumesController.name);

  constructor(private readonly service: ResumesService) {}

  // ── POST /resumes/upload-raw ──────────────────────────────────────────────
  // Upload only — no analysis triggered.
  // Static route must come BEFORE /:id to avoid param shadowing.

  @Post('upload-raw')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.logger.log(`POST /resumes/upload-raw — user: ${req.user?.id}`);

    if (!req.user?.id) throw new BadRequestException('User not authenticated');

    if (!file) throw new BadRequestException(
      'No file received. Field name must be "file" with Content-Type: multipart/form-data',
    );

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Accepted: PDF, DOCX, DOC`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 5 MB limit');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('File is empty');
    }

    return this.service.saveRawResume(file, req.user.id);
  }

  // ── POST /resumes/:id/analyse ─────────────────────────────────────────────
  // Triggered by the "Analyse Resume" sidebar button.
  // Enqueues analysis job for an already-uploaded resume.

  @Post(':id/analyse')
  async triggerAnalysis(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    this.logger.log(`POST /resumes/${id}/analyse — user: ${req.user?.id}`);
    return this.service.triggerAnalysis(id, req.user.id);
  }

  // ── GET /resumes ──────────────────────────────────────────────────────────

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user.id);
  }

  // ── GET /resumes/latest ───────────────────────────────────────────────────
  // Sidebar calls this on mount to check for an existing resume.
  // Must be declared before /:id to avoid param shadowing.

  @Get('latest')
  async getLatest(@Req() req: any) {
    return this.service.getLatest(req.user.id);
  }

  // ── GET /resumes/:id ──────────────────────────────────────────────────────
  // Status polling — frontend polls every 5s after analysis is triggered.

  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/require-await
  async getById(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user.id);
  }

  // ── GET /resumes/:id/analysis ─────────────────────────────────────────────

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string, @Req() req: any) {
    return this.service.getAnalysis(id, req.user.id);
  }
}