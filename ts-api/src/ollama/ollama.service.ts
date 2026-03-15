/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  OllamaMessage,
  OllamaChatResponse,
  OllamaTagsResponse,
  OllamaHealthStatus,
} from './dto/ollama.types';

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);
  private readonly client: AxiosInstance;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('ollama.baseUrl') || 'http://localhost:11434';
    this.model   = this.config.get<string>('ollama.model')   || 'llama3.1:8b';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 180_000,  // 3 min — CPU inference on large docs can be slow
      headers: { 'Content-Type': 'application/json' },
    });

    this.logger.log(`Ollama configured — endpoint: ${this.baseUrl} | model: ${this.model}`);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    // Non-blocking health check on startup
    // Warns if Ollama isn't reachable — doesn't crash the application
    const health = await this.checkHealth();
    if (!health.isHealthy) {
      this.logger.warn(
        `Ollama not reachable at ${this.baseUrl} — resume analysis will be unavailable. ` +
        `Ensure Ollama is running and model "${this.model}" is pulled.`,
      );
    } else {
      this.logger.log(
        `Ollama healthy — model "${this.model}" ready | ` +
        `response time: ${health.responseTimeMs}ms`,
      );
    }
  }

  // ── Core Chat Interface ─────────────────────────────────────────────────────

  async chat(messages: OllamaMessage[]): Promise<string> {
    const startTime = Date.now();

    try {
      const response = await this.client.post<OllamaChatResponse>('/api/chat', {
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature:    0.1,   // near-deterministic — critical for JSON extraction
          top_p:          0.9,
          num_predict:    4096,
          repeat_penalty: 1.1,
          stop: ['```', '</json>'],  // stop sequences to prevent runaway generation
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Inference complete — model: ${this.model} | ` +
        `tokens: ${response.data.eval_count ?? 'unknown'} | ` +
        `duration: ${duration}ms`,
      );

      return response.data.message.content;

    } catch (err) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Ollama inference failed after ${duration}ms: ${err.message}`,
      );

      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED') {
          throw new InternalServerErrorException(
            `Ollama is not running at ${this.baseUrl}. ` +
            `Start Ollama with: ollama serve`,
          );
        }
        if (err.code === 'ETIMEDOUT') {
          throw new InternalServerErrorException(
            `Ollama inference timed out after 3 minutes. ` +
            `Consider using a smaller model like llama3.2:3b.`,
          );
        }
        if (err.response?.status === 404) {
          throw new InternalServerErrorException(
            `Model "${this.model}" not found. ` +
            `Pull it with: ollama pull ${this.model}`,
          );
        }
      }

      throw new InternalServerErrorException(
        `AI inference failed: ${err.message}`,
      );
    }
  }

  // ── Structured JSON Extraction ──────────────────────────────────────────────
  // Primary interface for resume parsing — enforces JSON output contract

  async extractJson<T>(systemPrompt: string, userContent: string): Promise<T> {
    const raw = await this.chat([
      { role: 'system',    content: systemPrompt },
      { role: 'user',      content: userContent  },
    ]);

    return this.parseJsonSafely<T>(raw);
  }

  // ── Retry Wrapper ───────────────────────────────────────────────────────────
  // JSON extraction can fail if the model hallucinates non-JSON.
  // Retry with an explicit correction prompt before giving up.

  async extractJsonWithRetry<T>(
  systemPrompt: string,
  userContent: string,
  maxRetries = 2,
): Promise<T> {
  // ✅ Initialize with a typed default — satisfies TypeScript's strict
  // assignment analysis while preserving the actual error on failure
  let lastError: Error = new Error('JSON extraction failed — no attempts made');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      this.logger.log(`JSON extraction attempt ${attempt}/${maxRetries}`);
      return await this.extractJson<T>(systemPrompt, userContent);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      this.logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        userContent =
          `Your previous response was not valid JSON. ` +
          `Return ONLY a valid JSON object with no additional text, explanation, or markdown.\n\n` +
          userContent;
      }
    }
  }

  throw new InternalServerErrorException(
    `JSON extraction failed after ${maxRetries} attempts: ${lastError.message}`,
  );
}

  // ── Health Check ────────────────────────────────────────────────────────────

  async checkHealth(): Promise<OllamaHealthStatus> {
    const startTime = Date.now();

    try {
      const response = await this.client.get<OllamaTagsResponse>('/api/tags', {
        timeout: 5000, // Fast timeout for health checks
      });

      const availableModels = response.data.models.map((m) => m.name);
      const isModelAvailable = availableModels.some((m) =>
        m.startsWith(this.model.split(':')[0]),
      );

      if (!isModelAvailable) {
        this.logger.warn(
          `Model "${this.model}" not in available models: [${availableModels.join(', ')}]`,
        );
      }

      return {
        isHealthy:       true,
        model:           this.model,
        availableModels,
        responseTimeMs:  Date.now() - startTime,
      };

    } catch {
      return {
        isHealthy:      false,
        model:          this.model,
        availableModels: [],
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private parseJsonSafely<T>(raw: string): T {
    // Strip common model artifacts before parsing
    const cleaned = raw
      .replace(/```json\n?/gi, '')  // remove ```json fences
      .replace(/```\n?/g,     '')   // remove closing fences
      .replace(/^\s*[\w\s]*:/m, '') // remove preamble like "Here is the JSON:"
      .trim();

    // Find first JSON boundary character
    const startIndex = cleaned.search(/[{[]/);
    if (startIndex === -1) {
      this.logger.error(`No JSON found in response. Raw (200 chars): ${cleaned.slice(0, 200)}`);
      throw new InternalServerErrorException(
        `Model returned no JSON structure. Raw response: "${cleaned.slice(0, 100)}..."`,
      );
    }

    const jsonString = cleaned.slice(startIndex);

    try {
      return JSON.parse(jsonString) as T;
    } catch (parseError) {
      this.logger.error(
        `JSON.parse failed. ` +
        `Error: ${parseError.message} | ` +
        `Raw (500 chars): ${jsonString.slice(0, 500)}`,
      );
      throw new InternalServerErrorException(
        `Model returned malformed JSON: ${parseError.message}. ` +
        `Consider switching to a larger model for better instruction following.`,
      );
    }
  }
}