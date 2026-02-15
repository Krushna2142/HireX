import { Controller, Post, Body } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('fetch')
  async fetchJobs(@Body() body: any) {
    return this.jobsService.fetchJobs(body);
  }
}
