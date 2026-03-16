/* eslint-disable prettier/prettier */
// src/interviews/interviews.module.ts

import { Module }        from '@nestjs/common';
import { HttpModule }    from '@nestjs/axios';
import { InterviewsController } from './interviews.controller';
import { InterviewsService }    from './interviews.service';
import { AuthModule }    from '../auth/auth.module';
import { OllamaModule }  from '../ollama/ollama.module';   // ← provides LlmService
import { DatabaseModule } from '../database/datbase.module';
import { PrismaModule }  from '../../prisma/prisma.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 30_000 }),
    AuthModule,
    OllamaModule,     // ← provides LlmService via exports
    DatabaseModule,
    PrismaModule,
  ],
  controllers: [InterviewsController],
  providers:   [InterviewsService],
})
export class InterviewsModule {}