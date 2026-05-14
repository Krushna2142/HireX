/* eslint-disable prettier/prettier */
// src/recommendations/recommendations.module.ts

import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { AtsModule } from '../ats/ats.module';

@Module({
  imports: [AtsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}