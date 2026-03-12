/* eslint-disable prettier/prettier */
// ts-api/src/resumes/resumes.controller.ts
import {
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly service: ResumesService) {}

  /**
   * POST /resumes/upload
   * Frontend sends FormData with file.
   * ts-api forwards to Python for AI analysis, then saves result to DB.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    const userId = req.user.id;
    return this.service.uploadAndAnalyze(file, userId);
  }

  /**
   * POST /resumes/analyze-text
   * Analyze resume from plain text (for ATS checker page).
   */
  @Post('analyze-text')
  async analyzeText(
    @Body() body: { resume_text: string; job_description?: string },
    @Req() req: any,
  ) {
    return this.service.analyzeText(body.resume_text, body.job_description);
  }

  /**
   * POST /resumes/ats-check
   * Quick local ATS check — instant, no AI.
   */
  @Post('ats-check')
  async atsCheck(
    @Body() body: { resume_text: string; job_description?: string },
  ) {
    return this.service.atsCheck(body.resume_text, body.job_description);
  }

  /**
   * GET /resumes
   * Get user's past resume analyses.
   */
  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user.id);
  }
}