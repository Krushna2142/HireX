/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/resumes/python-nlp.service.ts
//
// HTTP client for the deployed Python spaCy NLP API.
// URL: https://job-crawler-fpat.onrender.com
//
// Why spaCy over Groq for resume parsing:
//   ✅ Deterministic — same input always produces same output
//   ✅ Purpose-built NER — trained on entity extraction tasks
//   ✅ Your infrastructure — no per-request API cost
//   ✅ No hallucination risk — rule-based + ML, not generative
//   ✅ Faster — no LLM inference overhead

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

// ── Response shape from Python spaCy API ─────────────────────────────────────
// These match the FastAPI response model from your Python service.
// If your Python API returns different field names, update the
// mapping in ResumeAnalysisService, not here.

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

// Render free tier cold starts can take 30-60s — generous timeout
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES        = 2;
const RETRY_DELAY_MS     = 3_000;

@Injectable()
export class PythonNlpService implements OnModuleInit {
  private readonly logger  = new Logger(PythonNlpService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly config:      ConfigService,
    private readonly httpService: HttpService,
  ) {
    // Fallback to your deployed Render URL if env var not set
    this.baseUrl = (
      this.config.get<string>('PYTHON_NLP_API_URL') ||
      'https://job-crawler-fpat.onrender.com'
    ).replace(/\/$/, '');   // strip trailing slash
  }

  // ── Startup health check ──────────────────────────────────────────────────
  // Render free tier spins down after inactivity. The health check
  // wakes the service on NestJS startup so the first resume analysis
  // doesn't time out waiting for a cold start.

  async onModuleInit(): Promise<void> {
    this.logger.log(`[nlp] Pinging Python NLP service at ${this.baseUrl}`);
    try {
      await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          timeout: 10_000,
        }),
      );
      this.logger.log(`✅ Python spaCy NLP service is reachable at ${this.baseUrl}`);
    } catch {
      this.logger.warn(
        `⚠️  Python NLP service not reachable at ${this.baseUrl}\n` +
        `   This is expected on first deploy (Render cold start).\n` +
        `   Resume analysis will retry automatically when the service wakes.\n` +
        `   Set PYTHON_NLP_API_URL in your environment if the URL has changed.`,
      );
    }
  }

  // ── Primary method: POST /analyse ─────────────────────────────────────────
  // Sends raw resume text to the Python spaCy API.
  // Returns structured NLP extraction result.

  async analyseResume(rawText: string): Promise<NlpAnalysisResult> {
    this.logger.log(
      `[nlp] Sending ${rawText.length} chars to spaCy API at ${this.baseUrl}/analyse`,
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const startMs = Date.now();

        const { data } = await firstValueFrom(
          this.httpService.post<NlpAnalysisResult>(
            `${this.baseUrl}/analyse`,
            { text: rawText },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: REQUEST_TIMEOUT_MS,
            },
          ),
        );

        const elapsedMs = Date.now() - startMs;
        this.logger.log(
          `[nlp] ✅ spaCy analysis complete in ${elapsedMs}ms — ` +
          `${data.skills?.length ?? 0} skills, ` +
          `${data.workExperience?.length ?? 0} roles, ` +
          `${data.education?.length ?? 0} education entries`,
        );

        return data;

      } catch (err) {
        lastError    = err as Error;
        const axErr  = err as AxiosError;
        const status = axErr?.response?.status;
        const detail = (axErr?.response?.data as any)?.detail;

        // 4xx = our problem (bad input) — don't retry
        if (status && status >= 400 && status < 500) {
          this.logger.error(
            `[nlp] Client error ${status}: ${detail ?? lastError.message}`,
          );
          throw new InternalServerErrorException(
            `NLP API rejected the request (${status}): ${detail ?? lastError.message}`,
          );
        }

        // Network / 5xx — retry with backoff
        const backoffMs = RETRY_DELAY_MS * attempt;
        this.logger.warn(
          `[nlp] Attempt ${attempt}/${MAX_RETRIES + 1} failed: ${lastError.message}` +
          (attempt <= MAX_RETRIES
            ? ` — retrying in ${backoffMs}ms (Render may be cold-starting)`
            : ' — no more retries'),
        );

        if (attempt <= MAX_RETRIES) {
          await this.sleep(backoffMs);
        }
      }
    }

    throw new InternalServerErrorException(
      `Python spaCy NLP service failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}. ` +
      `Check that ${this.baseUrl} is running.`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}