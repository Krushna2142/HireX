/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/resumes/resumes-analysis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import { LlmService }         from '../ollama/Llm.service';
import { Prisma, ResumeAnalysisStatus } from '@prisma/client';

const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

// ── Prisma JSON helper ────────────────────────────────────────────────────────

function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

// ── What Groq returns ─────────────────────────────────────────────────────────

export interface ResumeAnalysisResult {
  personalInfo: {
    name:      string | null;
    email:     string | null;
    phone:     string | null;
    location:  string | null;
    linkedin:  string | null;
    github:    string | null;
    portfolio: string | null;
  };
  workExperience: Array<{
    company:          string;
    title:            string;
    startDate:        string | null;
    endDate:          string | null;
    isCurrent:        boolean;
    responsibilities: string[];
    achievements:     string[];
  }>;
  education: Array<{
    institution:    string;
    degree:         string;
    field:          string;
    graduationYear: number | null;
    gpa:            string | null;
  }>;
  skills: Array<{
    name:        string;
    category:    'technical' | 'soft' | 'language' | 'tool';
    proficiency: number;
  }>;
  certifications: Array<{
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

// ── Groq system prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert resume parser. Extract structured data and return ONLY valid JSON.
No markdown fences, no explanation, no preamble — raw JSON only.

Return this exact schema:
{
  "personalInfo": {
    "name": string|null, "email": string|null, "phone": string|null,
    "location": string|null, "linkedin": string|null,
    "github": string|null, "portfolio": string|null
  },
  "workExperience": [{
    "company": string, "title": string,
    "startDate": string|null, "endDate": string|null,
    "isCurrent": boolean,
    "responsibilities": string[], "achievements": string[]
  }],
  "education": [{
    "institution": string, "degree": string, "field": string,
    "graduationYear": number|null, "gpa": string|null
  }],
  "skills": [{ "name": string, "category": "technical"|"soft"|"language"|"tool", "proficiency": 1-5 }],
  "certifications": [{ "name": string, "issuer": string, "issueDate": string|null, "expiryDate": string|null }],
  "projects": [{ "title": string, "description": string, "techStack": string[], "repoUrl": string|null, "liveUrl": string|null }],
  "languages": [{ "language": string, "proficiency": string }],
  "summary": string,
  "experienceYears": number,
  "experienceLevel": "junior"|"mid"|"senior"|"principal",
  "topSkills": string[],
  "industryTags": string[],
  "trajectory": string
}

Rules:
- experienceLevel: 0-2yrs=junior, 2-5=mid, 5-10=senior, 10+=principal
- topSkills: max 8 most relevant technical skills
- industryTags: domain tags e.g. ["fintech","saas","healthtech"]
- trajectory: one sentence career direction
- proficiency: 1=beginner 5=expert, infer from context
- Empty arrays [] for missing list fields, never null`;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);

  constructor(
    private readonly llm:    LlmService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Text extraction ───────────────────────────────────────────────────────

  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const result = await pdfParse(buffer);
      return result.text as string;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new Error(`Unsupported MIME type: ${mimetype}`);
  }

  // ── Main analysis pipeline ────────────────────────────────────────────────
  // Returns the extracted result so the processor can use it directly.
  // Profile sync is intentionally NOT done here — the processor owns that step.

  async analyzeResume(
    resumeId: string,
    buffer:   Buffer,
    mimetype: string,
  ): Promise<ResumeAnalysisResult> {
    this.logger.log(`[${resumeId}] Starting analysis — ${mimetype} — ${buffer.length} bytes`);

    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  {
        analysisStatus: ResumeAnalysisStatus.PROCESSING,
        analysisError: null,
      },
    });

    let rawText = '';
    let extracted: ResumeAnalysisResult;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // STAGE 1: Extract raw text from PDF/DOCX
      // ──────────────────────────────────────────────────────────────────────
      try {
        this.logger.log(`[${resumeId}] Stage 1: text extraction starting`);
        rawText = await this.extractText(buffer, mimetype);
        this.logger.log(`[${resumeId}] ✅ Stage 1 complete — Extracted ${rawText.length} chars`);

        if (rawText.trim().length < 50) {
          this.logger.warn(
            `[${resumeId}] ⚠️ Extracted text too short (${rawText.trim().length} chars) — ` +
            `using fallback extraction anyway`,
          );
        }
      } catch (extractErr) {
        const error = extractErr as Error;
        this.logger.warn(
          `[${resumeId}] ⚠️ Stage 1 failed: ${error.message} — proceeding with empty text`,
        );
        rawText = '';
      }

      // ──────────────────────────────────────────────────────────────────────
      // STAGE 2: Send to Gemini with automatic fallback on any failure
      // ──────────────────────────────────────────────────────────────────────
      try {
        this.logger.log(`[${resumeId}] Stage 2: Gemini LLM extraction`);
        if (rawText.trim().length > 50) {
          extracted = await this.llm.extractJson<ResumeAnalysisResult>(
            SYSTEM_PROMPT,
            `Parse this resume and return JSON:\n\n${rawText.slice(0, 10_000)}`,
          );
          this.logger.log(
            `[${resumeId}] ✅ Stage 2 complete — Gemini success: ` +
            `${extracted.skills?.length ?? 0} skills | level: ${extracted.experienceLevel}`,
          );
        } else {
          throw new Error('Not enough text for Gemini');
        }
      } catch (llmErr) {
        const error = llmErr as Error;
        this.logger.warn(
          `[${resumeId}] ⚠️ Stage 2 failed: ${error.message}. Using fallback extraction.`,
        );
        extracted = this.buildFallbackAnalysis(rawText);
        this.logger.log(`[${resumeId}] ✅ Fallback extraction complete`);
      }

      // Safety: ensure we always have a valid result
      if (!extracted?.personalInfo) {
        this.logger.warn(`[${resumeId}] Result missing personalInfo — rebuilding`);
        extracted = this.buildFallbackAnalysis(rawText);
      }

      // ──────────────────────────────────────────────────────────────────────
      // STAGE 3: Persist the analysis record to database
      // ──────────────────────────────────────────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 3: Persisting analysis to database`);
      
      try {
        const upsertResult = await this.prisma.resumeAnalysis.upsert({
          where:  { resumeId },
          create: {
            resumeId,
            rawText:         rawText,
            personalInfo:    toJson(extracted.personalInfo),
            workExperience:  toJson(extracted.workExperience  ?? []),
            education:       toJson(extracted.education        ?? []),
            skills:          toJson(extracted.skills           ?? []),
            certifications:  toJson(extracted.certifications   ?? []),
            projects:        toJson(extracted.projects         ?? []),
            languages:       toJson(extracted.languages        ?? []),
            experienceYears: extracted.experienceYears          ?? 0,
            experienceLevel: extracted.experienceLevel          ?? 'junior',
            topSkills:       extracted.topSkills                ?? [],
            industryTags:    extracted.industryTags             ?? [],
            trajectory:      extracted.trajectory               ?? '',
            status:          ResumeAnalysisStatus.COMPLETED,
            processedAt:     new Date(),
          },
          update: {
            rawText:         rawText,
            personalInfo:    toJson(extracted.personalInfo),
            workExperience:  toJson(extracted.workExperience  ?? []),
            education:       toJson(extracted.education        ?? []),
            skills:          toJson(extracted.skills           ?? []),
            certifications:  toJson(extracted.certifications   ?? []),
            projects:        toJson(extracted.projects         ?? []),
            languages:       toJson(extracted.languages        ?? []),
            experienceYears: extracted.experienceYears          ?? 0,
            experienceLevel: extracted.experienceLevel          ?? 'junior',
            topSkills:       extracted.topSkills                ?? [],
            industryTags:    extracted.industryTags             ?? [],
            trajectory:      extracted.trajectory               ?? '',
            status:          ResumeAnalysisStatus.COMPLETED,
            processedAt:     new Date(),
          },
        });
        this.logger.log(`[${resumeId}] ✅ Stage 3 complete — Analysis record persisted`);
      } catch (dbErr) {
        const error = dbErr as Error;
        this.logger.error(
          `[${resumeId}] ❌ Stage 3 CRITICAL — DB upsert failed: ${error.message}`,
        );
        throw error; // ← DB errors are critical, re-throw to mark as failed
      }

      // ──────────────────────────────────────────────────────────────────────
      // STAGE 4: Mark resume as analyzed (non-optional)
      // ──────────────────────────────────────────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 4: Updating resume status to ANALYZED`);
      
      try {
        const updateResult = await this.prisma.resume.update({
          where: { id: resumeId },
          data:  {
            analysisStatus: ResumeAnalysisStatus.COMPLETED,
            extractedText: rawText,
            analysisJson: toJson(extracted),
            analysisError: null,
            analyzedAt: new Date(),
          },
        });
        this.logger.log(`[${resumeId}] ✅ Stage 4 complete —resume marked as ANALYZED`);
      } catch (statusErr) {
        const error = statusErr as Error;
        this.logger.error(`[${resumeId}] ❌ Stage 4 CRITICAL — Failed to update resume status: ${error.message}`);
        throw error; // ← Status update is critical
      }

      this.logger.log(
        `[${resumeId}] ✅ ANALYSIS COMPLETE ✅\n` +
        `  Skills: ${extracted.skills?.length ?? 0}\n` +
        `  Level: ${extracted.experienceLevel}\n` +
        `  Experience: ${extracted.experienceYears} years`,
      );

      return extracted;

    } catch (err) {
      // ────────────────────────────────────────────────────────────────────
      // FATAL: Only reach here if analysis truly cannot complete
      // (e.g. corrupt resume file, database connection lost)
      // ────────────────────────────────────────────────────────────────────
      const error = err as Error;
      this.logger.error(
        `[${resumeId}] ❌❌ ANALYSIS FAILED (CRITICAL ERROR) ❌❌\n` +
        `  Error: ${error.message}\n` +
        `  Stack: ${error.stack?.split('\n').slice(0, 3).join('\n') ?? 'N/A'}`,
      );

      // Only set to 'failed' if we truly couldn't analyze
      try {
        await this.prisma.resume.update({
          where: { id: resumeId },
          data:  {
            analysisStatus: ResumeAnalysisStatus.FAILED,
            analysisError: error.message,
          },
        });
        this.logger.warn(`[${resumeId}] ⚠️ Resume marked as FAILED`);
      } catch (finalErr) {
        const fe = finalErr as Error;
        this.logger.error(`[${resumeId}] ❌❌ DOUBLE FAIL — Could not even mark as failed: ${fe.message}`);
      }

      throw err;
    }
  }

  // ── Profile completion score (0–100) ─────────────────────────────────────

  calculateCompletion(data: ResumeAnalysisResult): number {
    const checks = [
      !!data.personalInfo?.name,
      !!data.personalInfo?.email,
      !!data.personalInfo?.phone,
      !!data.personalInfo?.location,
      !!data.personalInfo?.linkedin,
      (data.workExperience?.length ?? 0) > 0,
      (data.education?.length      ?? 0) > 0,
      (data.skills?.length         ?? 0) > 0,
      !!data.summary,
      (data.projects?.length       ?? 0) > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private buildFallbackAnalysis(rawText: string): ResumeAnalysisResult {
    const text = rawText.toLowerCase();
    const skillsDb = [
      'javascript', 'typescript', 'python', 'java', 'react', 'next.js', 'node.js',
      'nestjs', 'express', 'postgresql', 'mysql', 'mongodb', 'redis', 'docker',
      'kubernetes', 'aws', 'azure', 'gcp', 'git', 'rest', 'graphql',
    ];

    const foundSkills = skillsDb.filter((s) => text.includes(s)).slice(0, 8);
    const yearsMatch = rawText.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
    const experienceYears = yearsMatch ? Number(yearsMatch[1]) : 0;

    let experienceLevel: ResumeAnalysisResult['experienceLevel'] = 'junior';
    if (experienceYears >= 10) experienceLevel = 'principal';
    else if (experienceYears >= 5) experienceLevel = 'senior';
    else if (experienceYears >= 2) experienceLevel = 'mid';

    return {
      personalInfo: {
        name: null,
        email: rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        portfolio: null,
      },
      workExperience: [],
      education: [],
      skills: foundSkills.map((name) => ({ name, category: 'technical', proficiency: 3 })),
      certifications: [],
      projects: [],
      languages: [],
      summary: rawText.slice(0, 500),
      experienceYears,
      experienceLevel,
      topSkills: foundSkills,
      industryTags: [],
      trajectory: 'Generated via fallback extraction due temporary LLM failure.',
    };
  }
}
