/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  Controller, Post, Get, Patch, Param,
  Body, Query, Req,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { Public } from '../auth/decorators/public.decorators';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // ── Public: unified job feed (internal + SerpAPI) ─────────────────────────

  @Public()
  @Get()
  browse(
    @Req() req: any,
    @Query('search')          search?: string,
    @Query('workMode')        workMode?: string,
    @Query('salaryMin')       salaryMin?: string,
    @Query('skills')          skills?: string,
    @Query('page')            page?: string,
    @Query('includeExternal') includeExternal?: string,
  ) {
    // Pass userId if authenticated so match scores can be computed
    const userId = req.user?.id || null;
    return this.jobs.browseJobsUnified(userId, {
      search,
      workMode,
      salaryMin:       salaryMin ? parseInt(salaryMin) : undefined,
      skills:          skills ? skills.split(',') : undefined,
      page:            page ? parseInt(page) : 1,
      includeExternal: includeExternal !== 'false',
    });
  }

  // ── Recruiter: post a job ─────────────────────────────────────────────────

  @Post()
  create(@Req() req: any, @Body() dto: CreateJobDto) {
    return this.jobs.createJob(req.user.id, dto);
  }

  // ── Recruiter: own postings with pipeline stats ───────────────────────────

  @Get('mine')
  getMyJobs(@Req() req: any) {
    return this.jobs.getRecruiterJobs(req.user.id);
  }

  // ── Recruiter: applicants for a specific job ──────────────────────────────

  @Get(':id/applicants')
  getApplicants(@Param('id') id: string, @Req() req: any) {
    return this.jobs.getJobApplicants(id, req.user.id);
  }

  // ── Recruiter: move applicant through pipeline ────────────────────────────

  @Patch('applications/:applicationId/status')
  updateStatus(
    @Param('applicationId') applicationId: string,
    @Req() req: any,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.jobs.updateApplicationStatus(applicationId, req.user.id, dto);
  }

  // ── Recruiter: pause / close / reopen job ────────────────────────────────

  @Patch(':id/status')
  updateJobStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body('status') status: 'active' | 'paused' | 'closed',
  ) {
    return this.jobs.updateJobStatus(id, req.user.id, status);
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

  // ── Candidate: own application history ───────────────────────────────────

  @Get('applications/mine')
  myApplications(@Req() req: any) {
    return this.jobs.getCandidateApplications(req.user.id);
  }
}