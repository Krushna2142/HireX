import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { SupabaseService } from '../database/supabase.service';
import { SerpAdapter } from './serp.adapter';

@Module({
  controllers: [JobsController],
  providers: [JobsService, SupabaseService, SerpAdapter],
})
export class JobsModule {}
