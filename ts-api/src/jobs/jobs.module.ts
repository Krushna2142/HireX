/* eslint-disable prettier/prettier */
// src/jobs/jobs.module.ts

import { Module }         from '@nestjs/common';
import { HttpModule }     from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsController } from './jobs.controller';
import { JobsService }    from './jobs.service';
import { JobsSyncService }from './jobs-sync.service';
import { SerpAdapter }    from './serp.adapter';
import { AlertsModule }   from '../alerts/alerts.module';
import { DatabaseModule } from '../database/datbase.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000, maxRedirects: 3 }),
    ScheduleModule.forRoot(),   // enables @Cron in JobsSyncService
    AlertsModule,
    DatabaseModule,
  ],
  controllers: [JobsController],
  providers:   [JobsService, JobsSyncService, SerpAdapter],
  exports:     [JobsService],
})
export class JobsModule {}