/* eslint-disable prettier/prettier */
//C:\Projects\Job-Crawler\ts-api\src\resumes\resumes.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [HttpModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}