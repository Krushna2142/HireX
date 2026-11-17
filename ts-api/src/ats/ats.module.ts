// ts-api/src/ats/ats.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ATS_QUEUE } from './ats.types';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { AtsProcessor } from './ats.processor';
import { AtsEvaluatorService } from './ats-evaluator.service';
import { AtsIntegrityService } from './ats-integrity.service';
import { JdProfileService } from './jd-profile.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ATS_QUEUE,
    }),
    // ✅ No OllamaModule / no LlmService here.
    // ATS AI inference goes NestJS → Python → NVIDIA NIM (Nemotron 3 Ultra).
  ],
  controllers: [AtsController],
  providers: [
    AtsService,
    AtsProcessor,
    AtsEvaluatorService,
    AtsIntegrityService,
    JdProfileService,
  ],
  exports: [AtsService, AtsEvaluatorService],
})
export class AtsModule {}