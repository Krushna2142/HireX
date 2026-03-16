/* eslint-disable prettier/prettier */
// src/ats/ats.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AtsService } from './ats.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
  ],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}