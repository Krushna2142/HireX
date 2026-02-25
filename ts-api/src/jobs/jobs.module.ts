/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SerpAdapter } from './serp.adapter';

@Module({
  controllers: [JobsController],
  providers: [SerpAdapter, JobsService],
  exports: [JobsService],
})
export class JobsModule {}