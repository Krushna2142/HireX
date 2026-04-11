/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/ollama/llm.service.ts
//
// Production LLM service — Gemini cloud only.
// Uses Gemini Generative AI via Google REST API.

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

const DEFAULT_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
    this.apiKey =
      this.config.get<string>('gemini.apiKey') ??
      this.config.get<string>('GEMINI_API_KEY') ??
      '';

    this.model =
      this.config.get<string>('gemini.model') ??
      this.config.get<string>('GEMINI_MODEL') ??
      DEFAULT_MODEL;
  }

  // ── Startup validation ────────────────────────────────────────────────────
  // Fail fast on missing config — better to crash at startup than
  // to let the first resume upload fail silently 30 seconds later.

  async onModuleInit(): Promise<void> {
  // Diagnose exactly what the runtime sees
  this.logger.log(`[startup] GEMINI_API_KEY present: ${!!this.apiKey}`);
  this.logger.log(`[startup] GEMINI_API_KEY length:  ${this.apiKey.length}`);
  this.logger.log(`[startup] GEMINI_MODEL:           ${this.model}`);

  if (!this.apiKey) {
    this.logger.error(
      'GEMINI_API_KEY is not set.\n' +
      '1. Get a key from Google AI Studio\n' +
      '2. Add GEMINI_API_KEY to environment variables\n' +
      '   3. Trigger a manual redeploy — env vars only apply after restart',
    );
    return;
  }

  this.logger.log(`Gemini LLM service ready — model: ${this.model}`);
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
        const raw    = await this.callGeminiApi(systemPrompt, userPrompt);
        const parsed = this.parseJson<T>(raw);

        if (attempt > 1) {
          this.logger.log(`[gemini] Succeeded on attempt ${attempt}`);
        }

        return parsed;

      } catch (err) {
        lastError = err as Error;
        const axiosErr = err as AxiosError;
        const status   = axiosErr.response?.status;

        // ── 4xx client errors: don't retry, throw immediately ──────────────
        if (status && status >= 400 && status < 500 && status !== 429) {
          this.logger.error(`[gemini] Client error ${status} — not retrying`);
          throw new InternalServerErrorException(
            `Gemini API error ${status}: ${this.extractErrorMessage(axiosErr)}`,
          );
        }

        // ── 429 rate limit: back off longer ───────────────────────────────
        const isRateLimit   = status === 429;
        const backoffMs     = isRateLimit
          ? RATE_LIMIT_BACKOFF_MS * Math.pow(2, attempt - 1)   // 2s → 4s → 8s
          : 1_000 * attempt;                                     // 1s → 2s → 3s

        this.logger.warn(
          `[gemini] Attempt ${attempt}/${maxRetries + 1} failed` +
          `${isRateLimit ? ' (rate limited)' : ''}: ${lastError.message}` +
          (attempt <= maxRetries ? ` — retrying in ${backoffMs}ms` : ''),
        );

        if (attempt <= maxRetries) {
          await this.sleep(backoffMs);
        }
      }
    }

    throw new InternalServerErrorException(
      `Gemini LLM failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
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

  // ── Gemini API call ────────────────────────────────────────────────────────

  private async callGeminiApi(
    systemPrompt: string,
    userPrompt:   string,
  ): Promise<string> {
    const startMs = Date.now();

    const { data } = await firstValueFrom(
      this.httpService.post(
        `${GEMINI_API_URL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        },
        {
          headers: {
            'Content-Type':  'application/json',
          },
          timeout: 30_000,
        },
      ),
    );

    const elapsedMs = Date.now() - startMs;
    const content =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
        .trim() ?? '';

    if (!content) {
      throw new Error('Gemini returned empty response');
    }

    this.logger.log(
      `[gemini] ${this.model} responded in ${elapsedMs}ms ` +
      `(${content.length} chars | ` +
      `tokens: ${data?.usageMetadata?.totalTokenCount ?? 'N/A'})`,
    );

    return content;
  }

  // ── JSON parsing ──────────────────────────────────────────────────────────
  //
  // Gemini usually returns clean JSON when instructed, but occasionally
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
        `Gemini returned non-JSON output. ` +
        `Preview: "${cleaned.slice(0, 300)}"`,
      );
    }
  }

  // ── Guards & utilities ────────────────────────────────────────────────────

  private assertApiKeyConfigured(): void {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured. ' +
        'Get a key from Google AI Studio and add it to your environment variables.',
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