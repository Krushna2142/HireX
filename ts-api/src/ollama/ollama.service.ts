/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/ollama/llm.service.ts
//
// Single-provider LLM service — Mistral via Ollama.
// No external API keys required. Runs entirely on your infrastructure.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger  = new Logger(LlmService.name);
  private readonly baseUrl: string;
  private readonly model  = 'mistral';   // locked to Mistral — no config needed

  constructor(
    private readonly config:      ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
  }

  // ── Startup connectivity check ────────────────────────────────────────────
  // Fails fast with a clear message instead of letting the first
  // resume upload silently fail 2 minutes later.

  async onModuleInit(): Promise<void> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/tags`, { timeout: 5_000 }),
      );

      const models: string[] = (data.models || []).map((m: any) => m.name as string);
      const hasMistral = models.some(m => m.startsWith('mistral'));

      if (hasMistral) {
        this.logger.log(`✅ Ollama ready — mistral found at ${this.baseUrl}`);
      } else {
        this.logger.warn(
          `⚠️  Ollama is running but mistral is not pulled.\n` +
          `   Fix: ollama pull mistral\n` +
          `   Available models: ${models.join(', ') || 'none'}`,
        );
      }
    } catch {
      this.logger.error(
        `❌ Ollama unreachable at ${this.baseUrl}\n` +
        `   Ensure Ollama is running: https://ollama.ai\n` +
        `   Then pull the model:      ollama pull mistral`,
      );
    }
  }

  // ── Primary interface ─────────────────────────────────────────────────────
  // Used by ResumeAnalysisService and InterviewsService.
  // Retries on JSON parse failure — Mistral occasionally wraps output
  // in markdown fences despite explicit instructions.

  async extractJson<T>(
    systemPrompt: string,
    userPrompt:   string,
    maxRetries    = 2,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const raw    = await this.complete(systemPrompt, userPrompt);
        const parsed = this.parseJson<T>(raw);
        return parsed;
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `[mistral] JSON extraction attempt ${attempt}/${maxRetries + 1} failed: ${lastError.message}`,
        );
        if (attempt <= maxRetries) {
          await this.sleep(1_000 * attempt);  // 1s → 2s backoff
        }
      }
    }

    throw new Error(
      `Mistral failed to return valid JSON after ${maxRetries + 1} attempts: ${lastError?.message}`,
    );
  }

  // Alias — keeps InterviewsService call sites unchanged
  async extractJsonWithRetry<T>(
    systemPrompt: string,
    userPrompt:   string,
    maxRetries    = 2,
  ): Promise<T> {
    return this.extractJson<T>(systemPrompt, userPrompt, maxRetries);
  }

  // ── Ollama /api/generate call ─────────────────────────────────────────────

  private async complete(
    systemPrompt: string,
    userPrompt:   string,
  ): Promise<string> {
    this.logger.debug(`[mistral] Sending prompt (${userPrompt.length} chars)`);

    const { data } = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/api/generate`,
        {
          model:  this.model,
          // Mistral uses a single `prompt` field — system + user combined
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.1,   // low = deterministic JSON, not creative
            top_p:       0.9,
            num_predict: 4096,  // max output tokens
          },
        },
        { timeout: 120_000 },   // 2 min — Mistral on CPU can be slow for long resumes
      ),
    );

    const response = data.response ?? '';
    this.logger.debug(`[mistral] Response received (${response.length} chars)`);
    return response;
  }

  // ── JSON parser — strips markdown fences ─────────────────────────────────
  // Mistral sometimes wraps JSON in ```json ... ``` despite the system
  // prompt saying not to. This handles both clean and wrapped output.

  private parseJson<T>(raw: string): T {
    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/,        '')
      .trim();

    // Fast path — clean JSON
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Slow path — find the first complete JSON object/array in noisy output
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[1]) as T;
        } catch {
          // fall through to final throw
        }
      }

      throw new Error(
        `Could not parse JSON from Mistral output. ` +
        `First 300 chars: ${cleaned.slice(0, 300)}`,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}