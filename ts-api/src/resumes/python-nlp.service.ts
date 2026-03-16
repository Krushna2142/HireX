/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/resumes/python-nlp.service.ts
//
// HTTP client for the Python spaCy NLP API deployed on Render.
//
// Responsibilities:
//   - POST raw resume text to Python /analyse endpoint
//   - Handle timeouts, retries, and error normalisation
//   - Health check on startup to surface config problems early
//
// Environment variables:
//   PYTHON_NLP_API_URL — base URL of deployed Python service
//                        e.g. https://job-crawler-nlp.onrender.com
//   PYTHON_NLP_API_KEY — optional Bearer token if API is protected

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

// ── Response shape from Python API ───────────────────────────────────────────
// Must match AnalyseResponse in python/app/models/schemas.py exactly.

export interface NlpPersonalInfo {
  name:      string | null;
  email:     string | null;
  phone:     string | null;
  location:  string | null;
  linkedin:  string | null;
  github:    string | null;
  portfolio: string | null;
}

export interface NlpWorkExperience {
  company:          string;
  title:            string;
  startDate:        string | null;
  endDate:          string | null;
  isCurrent:        boolean;
  responsibilities: string[];
  achievements:     string[];
}

export interface NlpEducation {
  institution:    string;
  degree:         string;
  field:          string;
  graduationYear: number | null;
  gpa:            string | null;
}

export interface NlpSkill {
  name:        string;
  category:    string;
  proficiency: number;
}

export interface NlpAnalysisResult {
  personalInfo:    NlpPersonalInfo;
  workExperience:  NlpWorkExperience[];
  education:       NlpEducation[];
  skills:          NlpSkill[];
  certifications:  Array<{
    name:       string;
    issuer:     string;
    issueDate:  string | null;
    expiryDate: string | null;
  }>;
  projects: Array<{
    title:       string;
    description: string;
    techStack:   string[];
    repoUrl:     string | null;
    liveUrl:     string | null;
  }>;
  languages: Array<{
    language:    string;
    proficiency: string;
  }>;
  summary:         string;
  experienceYears: number;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'principal';
  topSkills:       string[];
  industryTags:    string[];
  trajectory:      string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 60_000;  // spaCy on cold start can be slow
const MAX_RETRIES        = 2;
const RETRY_DELAY_MS     = 2_000;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PythonNlpService implements OnModuleInit {
  private readonly logger  = new Logger(PythonNlpService.name);
  private readonly baseUrl: string;
  private readonly apiKey:  string | null;

  constructor(
    private readonly config:      ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = (
      this.config.get<string>('PYTHON_NLP_API_URL') ?? 'http://localhost:8001'
    ).replace(/\/$/, '');   // strip trailing slash

    this.apiKey = this.config.get<string>('PYTHON_NLP_API_KEY') ?? null;
  }

  // ── Startup health check ──────────────────────────────────────────────────
  // Validates the Python API is reachable before the first resume upload.
  // Logs a warning but does NOT crash the app — Render cold starts mean
  // the Python service may not be ready the instant NestJS boots.

  async onModuleInit(): Promise<void> {
    this.logger.log(`[nlp] Connecting to Python NLP API at: ${this.baseUrl}`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          headers: this.buildHeaders(),
          timeout: 8_000,
        }),
      );

      this.logger.log(
        `✅ Python NLP API reachable — ` +
        `model_loaded: ${data.model_loaded} | ` +
        `startup_time: ${data.startup_time ?? 'N/A'}`,
      );
    } catch {
      this.logger.warn(
        `⚠️  Python NLP API not reachable at ${this.baseUrl}\n` +
        `   Resume analysis will fail until the service is available.\n` +
        `   Check: PYTHON_NLP_API_URL environment variable on Render.\n` +
        `   Expected: GET ${this.baseUrl}/health → { status: "ok" }`,
      );
    }
  }

  // ── Primary method: analyse resume text ──────────────────────────────────
  // Sends raw text to POST /analyse and returns structured extraction.
  // Retries on network errors and 5xx responses.
  // Does NOT retry on 4xx — bad request won't improve with retries.

  async analyseText(rawText: string): Promise<NlpAnalysisResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const startMs = Date.now();

        const { data } = await firstValueFrom(
          this.httpService.post<NlpAnalysisResult>(
            `${this.baseUrl}/analyse`,
            { text: rawText },
            {
              headers: this.buildHeaders(),
              timeout: DEFAULT_TIMEOUT_MS,
            },
          ),
        );

        const elapsed = Date.now() - startMs;
        this.logger.log(
          `[nlp] Analysis complete in ${elapsed}ms — ` +
          `${data.skills?.length ?? 0} skills | ` +
          `${data.workExperience?.length ?? 0} roles | ` +
          `level: ${data.experienceLevel}`,
        );

        return data;

      } catch (err) {
        lastError      = err as Error;
        const axiosErr = err as AxiosError;
        const status   = axiosErr?.response?.status;
        const detail   = (axiosErr?.response?.data as any)?.detail ?? lastError.message;

        // Hard 4xx failure — bad request, no point retrying
        if (status && status >= 400 && status < 500) {
          this.logger.error(`[nlp] Client error ${status}: ${detail}`);
          throw new InternalServerErrorException(
            `NLP API rejected request (${status}): ${detail}`,
          );
        }

        this.logger.warn(
          `[nlp] Attempt ${attempt}/${MAX_RETRIES + 1} failed: ${lastError.message}` +
          (attempt <= MAX_RETRIES ? ` — retrying in ${RETRY_DELAY_MS * attempt}ms` : ''),
        );

        if (attempt <= MAX_RETRIES) {
          await this.sleep(RETRY_DELAY_MS * attempt);  // 2s → 4s backoff
        }
      }
    }

    throw new InternalServerErrorException(
      `Python NLP API failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}