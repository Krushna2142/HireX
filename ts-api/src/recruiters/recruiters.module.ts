/* eslint-disable prettier/prettier */
// ts-api/src/recruiters/recruiters.module.ts

import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DatabaseModule } from '../database/datbase.module';

import { RecruitersController } from './recruiters.controller';
import { RecruitersService } from './recruiters.service';

@Module({
  imports: [PrismaModule, DatabaseModule],
  controllers: [RecruitersController],
  providers: [RecruitersService],
  exports: [RecruitersService],
})
export class RecruitersModule {}