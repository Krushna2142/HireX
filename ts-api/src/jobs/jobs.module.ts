// src/jobs/jobs.module.ts
/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsSyncService } from './jobs-sync.service';
import { JobsStreamService } from './jobs-stream.service';
import { ApplicationAtsService } from './application-ats.service';

import { SerpPlatformAdapter } from './adapters/serp.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { IndeedAdapter } from './adapters/indeed.adapter';

import { AlertsModule } from '../alerts/alerts.module';
import { DatabaseModule } from '../database/datbase.module';
import { OllamaModule } from '../ollama/ollama.module';
import { AtsModule } from '../ats/ats.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000, maxRedirects: 3 }),
    AlertsModule,
    DatabaseModule,
    OllamaModule,
    AtsModule,
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsSyncService,
    JobsStreamService,
    ApplicationAtsService,
    SerpPlatformAdapter,
    LinkedInAdapter,
    IndeedAdapter,
  ],
  exports: [JobsService, JobsStreamService],
})
export class JobsModule {}