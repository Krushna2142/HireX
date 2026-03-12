import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// ts-api/src/jobs/jobs.controller.ts
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(@Query('search') search?: string) {
    return { jobs: await this.service.getAll(search) };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(
    @Query('q') query: string,
    @Query('location') location?: string,
  ) {
    return this.service.fetchAndStore(query, location);
  }

  @Get('match/:resumeId')
  @UseGuards(JwtAuthGuard)
  async match(@Param('resumeId') resumeId: string) {
    return this.service.match(resumeId);
  }
}