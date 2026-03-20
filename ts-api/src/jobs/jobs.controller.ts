/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/jobs/jobs.controller.ts

import {
  Controller, Get, Post, Patch, Param,
  Body, Query, Req, UseGuards, Sse, MessageEvent,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { Public }          from '../auth/decorators/public.decorators';
import { JobsService }     from './jobs.service';
import { JobsStreamService } from './jobs-stream.service';
import { CreateJobDto }    from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(
    private readonly jobs:   JobsService,
    private readonly stream: JobsStreamService,   // ← inject stream service
  ) {}

  // ── SSE: real-time job + alert events ────────────────────────────────────
  // Clients connect once — server pushes events as they happen.
  // EventSource auto-reconnects on disconnect — no manual retry logic needed.
  // @Public() because EventSource API cannot send Authorization headers.
  // Token-based auth for SSE would require query param — acceptable tradeoff.

  @Public()
  @Sse('stream')
  liveStream(): Observable<MessageEvent> {
    return this.stream.stream.pipe(
      map(event => ({
        data: JSON.stringify(event),
        type: event.type,
      } as MessageEvent))
    );
  }

  // ── Public: browse all jobs ───────────────────────────────────────────────

  @Public()
  @Get()
  browse(
    @Req() req: any,
    @Query('search')    search?: string,
    @Query('workMode')  workMode?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('skills')    skills?: string,
    @Query('page')      page?: string,
    @Query('source')    source?: string,
  ) {
    return this.jobs.browseJobs(req.user?.id ?? null, {
      search,
      workMode,
      salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
      skills:    skills    ? skills.split(',')       : undefined,
      page:      page      ? parseInt(page, 10)      : 1,
      source:    (source as 'internal' | 'serpapi' | 'all') ?? 'all',
    });
  }

  // ── Candidate: personalised recommendations ───────────────────────────────

  @Get('recommendations')
  recommendations(@Req() req: any) {
    return this.jobs.getRecommendations(req.user.id);
  }

  // ── Candidate: own applications ───────────────────────────────────────────

  @Get('applications/mine')
  myApplications(@Req() req: any) {
    return this.jobs.getCandidateApplications(req.user.id);
  }

  // ── Recruiter: own internal postings ─────────────────────────────────────

  @Get('mine')
  myJobs(@Req() req: any) {
    return this.jobs.getRecruiterJobs(req.user.id);
  }

  // ── Recruiter: applicants for a job ──────────────────────────────────────

  @Get(':id/applicants')
  applicants(@Param('id') id: string, @Req() req: any) {
    return this.jobs.getJobApplicants(id, req.user.id);
  }

  // ── Recruiter: create internal job posting ────────────────────────────────

  @Post()
  create(@Body() dto: CreateJobDto, @Req() req: any) {
    return this.jobs.createJob(req.user.id, dto);
  }

  // ── Candidate: apply to internal job ─────────────────────────────────────

  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @Req() req: any,
    @Body('resumeId')    resumeId: string,
    @Body('coverLetter') coverLetter?: string,
  ) {
    return this.jobs.applyToJob(req.user.id, id, resumeId, coverLetter);
  }

  // ── Recruiter: move application through pipeline ──────────────────────────

  @Patch('applications/:appId/status')
  updateAppStatus(
    @Param('appId') appId: string,
    @Req() req: any,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.jobs.updateApplicationStatus(appId, req.user.id, dto);
  }

  // ── Recruiter: update job listing status ─────────────────────────────────

  @Patch(':id/status')
  updateJobStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body('status') status: 'active' | 'paused' | 'closed',
  ) {
    return this.jobs.updateJobStatus(id, req.user.id, status);
  }
}