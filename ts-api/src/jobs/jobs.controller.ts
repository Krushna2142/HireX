/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Query, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('location') location?: string,
  ) {
    return this.service.fetchAndStore(query, location);
  }

  @Get('match/:resumeId')
  async match(@Param('resumeId') resumeId: string) {
    return this.service.match(resumeId);
  }
}
