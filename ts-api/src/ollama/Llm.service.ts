/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/ollama/llm.service.ts
//
// Production LLM service — Groq cloud only.
// Uses mixtral-8x7b-32768 via Groq's OpenAI-compatible API.
//
// Why Groq:
//   - Free tier: 14,400 requests/day, 5 req/min
//   - Speed:     ~500ms vs ~60s local CPU inference
//   - Zero infra: no GPU, no Ollama, no server management
//   - Reliability: 99.9% uptime SLA

import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService }   from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError }    from 'axios';

// ── Groq model config ─────────────────────────────────────────────────────────
//
// mixtral-8x7b-32768 is the best choice for structured JSON extraction:
//   - 32K context window handles even lengthy resumes in one shot
//   - Mixture-of-Experts architecture = strong instruction following
//   - Fastest model on Groq's infrastructure
//
// Other available Groq models (swap via GROQ_MODEL env var if needed):
//   llama-3.1-70b-versatile  — highest quality, slower
//   llama-3.1-8b-instant     — fastest, lower quality
//   gemma2-9b-it             — Google's model, good for structured tasks

const DEFAULT_MODEL    = 'mixtral-8x7b-32768';
const GROQ_API_URL     = 'https://api.groq.com/openai/v1/chat/completions';

// ── Rate limit config ─────────────────────────────────────────────────────────
//
// Groq free tier: 30 req/min, 14,400 req/day
// We respect this with exponential backoff on 429s.

const RATE_LIMIT_BACKOFF_MS = 2_000;   // initial wait on 429
const MAX_RETRIES           = 3;

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly model:  string;

  constructor(
    private readonly config:      ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.config.get<string>('GROQ_API_KEY') ?? '';
    this.model  = this.config.get<string>('GROQ_MODEL')   ?? DEFAULT_MODEL;
  }

  // ── Startup validation ────────────────────────────────────────────────────
  // Fail fast on missing config — better to crash at startup than
  // to let the first resume upload fail silently 30 seconds later.

  async onModuleInit(): Promise<void> {
    if (!this.apiKey) {
      this.logger.error(
        '❌ GROQ_API_KEY is not set.\n' +
        '   1. Get a free key at console.groq.com\n' +
        '   2. Add GROQ_API_KEY to your .env and Render environment variables',
      );
      // Don't throw — allow app to start so other features work.
      // LLM calls will fail with a clear error when attempted.
      return;
    }

    this.logger.log(`✅ Groq LLM service ready — model: ${this.model}`);
  }

  // ── Primary public interface ──────────────────────────────────────────────
  //
  // extractJson<T>() is the single entry point for all LLM calls.
  // Both ResumeAnalysisService and InterviewsService call this.
  //
  // Retry strategy:
  //   - Parse failure  → retry immediately (bad output, try again)
  //   - 429 rate limit → exponential backoff then retry
  //   - 5xx server err → retry with backoff
  //   - 4xx client err → throw immediately (bad request, no point retrying)

  async extractJson<T>(
    systemPrompt: string,
    userPrompt:   string,
    maxRetries    = MAX_RETRIES,
  ): Promise<T> {
    this.assertApiKeyConfigured();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const raw    = await this.callGroqApi(systemPrompt, userPrompt);
        const parsed = this.parseJson<T>(raw);

        if (attempt > 1) {
          this.logger.log(`[groq] Succeeded on attempt ${attempt}`);
        }

        return parsed;

      } catch (err) {
        lastError = err as Error;
        const axiosErr = err as AxiosError;
        const status   = axiosErr.response?.status;

        // ── 4xx client errors: don't retry, throw immediately ──────────────
        if (status && status >= 400 && status < 500 && status !== 429) {
          this.logger.error(`[groq] Client error ${status} — not retrying`);
          throw new InternalServerErrorException(
            `Groq API error ${status}: ${this.extractErrorMessage(axiosErr)}`,
          );
        }

        // ── 429 rate limit: back off longer ───────────────────────────────
        const isRateLimit   = status === 429;
        const backoffMs     = isRateLimit
          ? RATE_LIMIT_BACKOFF_MS * Math.pow(2, attempt - 1)   // 2s → 4s → 8s
          : 1_000 * attempt;                                     // 1s → 2s → 3s

        this.logger.warn(
          `[groq] Attempt ${attempt}/${maxRetries + 1} failed` +
          `${isRateLimit ? ' (rate limited)' : ''}: ${lastError.message}` +
          (attempt <= maxRetries ? ` — retrying in ${backoffMs}ms` : ''),
        );

        if (attempt <= maxRetries) {
          await this.sleep(backoffMs);
        }
      }
    }

    throw new InternalServerErrorException(
      `Groq LLM failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    );
  }

  // Alias — keeps InterviewsService call sites compatible
  async extractJsonWithRetry<T>(
    systemPrompt: string,
    userPrompt:   string,
    maxRetries    = MAX_RETRIES,
  ): Promise<T> {
    return this.extractJson<T>(systemPrompt, userPrompt, maxRetries);
  }

  // ── Groq API call ─────────────────────────────────────────────────────────

  private async callGroqApi(
    systemPrompt: string,
    userPrompt:   string,
  ): Promise<string> {
    const startMs = Date.now();

    const { data } = await firstValueFrom(
      this.httpService.post(
        GROQ_API_URL,
        {
          model:       this.model,
          temperature: 0.1,      // low = deterministic, consistent JSON structure
          max_tokens:  4096,
          // response_format not forced — system prompt handles JSON instruction
          // Groq's mixtral handles the "return only JSON" instruction reliably
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type':  'application/json',
          },
          timeout: 30_000,   // 30s timeout — Groq rarely exceeds 3s
        },
      ),
    );

    const elapsedMs = Date.now() - startMs;
    const content   = data.choices?.[0]?.message?.content ?? '';

    this.logger.log(
      `[groq] ${this.model} responded in ${elapsedMs}ms ` +
      `(${content.length} chars | ` +
      `tokens: ${data.usage?.total_tokens ?? 'N/A'})`,
    );

    return content;
  }

  // ── JSON parsing ──────────────────────────────────────────────────────────
  //
  // Mixtral reliably returns clean JSON when instructed, but occasionally
  // wraps it in markdown fences. This handles both cases.

  private parseJson<T>(raw: string): T {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/,        '')
      .trim();

    // Fast path — clean JSON object or array
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Slow path — extract first JSON structure from noisy output
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[1]) as T;
        } catch {
          // fall through to error
        }
      }

      throw new Error(
        `Groq returned non-JSON output. ` +
        `Preview: "${cleaned.slice(0, 300)}"`,
      );
    }
  }

  // ── Guards & utilities ────────────────────────────────────────────────────

  private assertApiKeyConfigured(): void {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'GROQ_API_KEY is not configured. ' +
        'Get a free key at console.groq.com and add it to your environment variables.',
      );
    }
  }

  private extractErrorMessage(err: AxiosError): string {
    const data = err.response?.data as any;
    return data?.error?.message ?? data?.message ?? err.message;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}