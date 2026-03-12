/* eslint-disable prettier/prettier */
// ts-api/src/resumes/resumes.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { DatabaseModule } from '../database/datbase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}