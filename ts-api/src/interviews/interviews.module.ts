/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/datbase.module';
import { OllamaModule } from '../ollama/ollama.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    AuthModule,
    DatabaseModule,
    PrismaModule,
    OllamaModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}