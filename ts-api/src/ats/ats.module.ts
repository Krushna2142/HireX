/* eslint-disable prettier/prettier */
// ts-api/src/ats/ats.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ATS_QUEUE } from './ats.types';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { AtsProcessor } from './ats.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ATS_QUEUE,
    }),
  ],
  controllers: [AtsController],
  providers: [AtsService, AtsProcessor],
  exports: [AtsService],
})
export class AtsModule {}