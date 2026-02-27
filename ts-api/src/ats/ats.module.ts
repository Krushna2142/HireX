//  C:\Projects\Job-Crawler\ts-api\src\ats\ats.module.ts
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AtsService } from './ats.service';

@Module({
  imports: [HttpModule],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}