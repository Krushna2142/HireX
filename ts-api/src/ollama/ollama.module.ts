/* eslint-disable prettier/prettier */
// src/ollama/ollama.module.ts
import { Module }     from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from './Llm.service';

@Module({
  imports:   [HttpModule],
  providers: [LlmService],
  exports:   [LlmService],
})
export class OllamaModule {}