/* eslint-disable prettier/prettier */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { FirebaseGuard } from '../auth/firebase.guard';

@Controller('jobs')
@UseGuards(FirebaseGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getJobs(
    @Query('q') query: string,
    @Query('location') location?: string,
  ) {
    return this.jobsService.fetchJobs(query, location);
  }
}