import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { SerpAdapter } from './serp.adapter';
import { AuthModule } from '../auth/auth.module';
// ts-api/src/jobs/jobs.module.ts
@Module({
  imports: [AuthModule],
  controllers: [JobsController],
  providers: [JobsService, SerpAdapter],
})
export class JobsModule {}