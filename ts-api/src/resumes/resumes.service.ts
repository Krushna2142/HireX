/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
// src/resumes/resumes-analysis.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LlmService }    from '../ollama/Llm.service';   // ← Groq-backed
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma }        from '@prisma/client';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

// ── Prisma JSON helper ────────────────────────────────────────────────────────

function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

// ── Domain interfaces ─────────────────────────────────────────────────────────

interface WorkExperience {
  company:          string;
  title:            string;
  startDate:        string;
  endDate:          string | null;
  isCurrent:        boolean;
  responsibilities: string[];
  achievements:     string[];
}

interface Education {
  institution:    string;
  degree:         string;
  field:          string;
  graduationYear: number | null;
  gpa:            string | null;
}

interface Skill {
  name:        string;
  category:    'frontend' | 'backend' | 'devops' | 'database' | 'cloud' | 'soft' | 'other';
  proficiency: 1 | 2 | 3 | 4 | 5;
}

interface ExtractedResume {
  personalInfo: {
    name:      string;
    email:     string | null;
    phone:     string | null;
    location:  string | null;
    linkedin:  string | null;
    github:    string | null;
    portfolio: string | null;
  };
  workExperience:  WorkExperience[];
  education:       Education[];
  skills:          Skill[];
  certifications:  Array<{
    name:        string;
    issuer:      string;
    issueDate:   string | null;
    expiryDate:  string | null;
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
    proficiency: 'native' | 'fluent' | 'intermediate' | 'basic';
  }>;
  summary:         string;
  experienceYears: number;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'principal';
  topSkills:       string[];
  industryTags:    string[];
  trajectory:      string;
}

// ── Extraction prompt ─────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `
You are a specialized resume parser. Extract structured data from resume text.

CRITICAL RULES:
1. Return ONLY valid JSON — no preamble, no explanation, no markdown fences
2. Never invent data not present in the resume
3. Use null for missing fields, never empty strings
4. Dates must be "YYYY-MM" format or null
5. experienceYears must be calculated from actual work history dates
6. experienceLevel: junior=0-2yrs, mid=2-5yrs, senior=5-10yrs, principal=10+yrs

Return this exact JSON structure:
{
  "personalInfo": {
    "name": string,
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "github": string | null,
    "portfolio": string | null
  },
  "workExperience": [{
    "company": string,
    "title": string,
    "startDate": "YYYY-MM" | null,
    "endDate": "YYYY-MM" | null,
    "isCurrent": boolean,
    "responsibilities": string[],
    "achievements": string[]
  }],
  "education": [{
    "institution": string,
    "degree": string,
    "field": string,
    "graduationYear": number | null,
    "gpa": string | null
  }],
  "skills": [{
    "name": string,
    "category": "frontend|backend|devops|database|cloud|soft|other",
    "proficiency": 1-5
  }],
  "certifications": [{
    "name": string,
    "issuer": string,
    "issueDate": string | null,
    "expiryDate": string | null
  }],
  "projects": [{
    "title": string,
    "description": string,
    "techStack": string[],
    "repoUrl": string | null,
    "liveUrl": string | null
  }],
  "languages": [{
    "language": string,
    "proficiency": "native|fluent|intermediate|basic"
  }],
  "summary": string,
  "experienceYears": number,
  "experienceLevel": "junior|mid|senior|principal",
  "topSkills": string[],
  "industryTags": string[],
  "trajectory": string
}
`.trim();

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly llm:    LlmService,    // ← was OllamaService
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

  async analyzeResume(
    resumeId: string,
    buffer:   Buffer,
    mimetype: string,
  ): Promise<void> {
    this.logger.log(`[${resumeId}] Starting analysis — ${mimetype} — ${buffer.length} bytes`);

    // Mark as processing immediately so the frontend poll sees the state change
    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  { status: 'processing' },
    });

    try {
      // ── Stage 1: Extract raw text from file ──────────────────────────────
      this.logger.log(`[${resumeId}] Stage 1: text extraction`);
      const rawText = await this.extractText(buffer, mimetype);
      this.logger.log(`[${resumeId}] Extracted ${rawText.length} characters`);

      if (rawText.trim().length < 50) {
        throw new Error(
          `Extracted text too short (${rawText.trim().length} chars). ` +
          `File may be a scanned image — use a text-based PDF.`,
        );
      }

      // ── Stage 2: Groq inference ───────────────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 2: sending to Groq (mixtral-8x7b-32768)`);

      const extracted = await this.llm.extractJson<ExtractedResume>(
        EXTRACTION_SYSTEM_PROMPT,
        // Slice to 8000 chars — well within mixtral's 32K context window,
        // but avoids wasting tokens on resumes with appended garbage text
        `Parse this resume and return structured JSON:\n\n${rawText.slice(0, 8000)}`,
      );

      this.logger.log(
        `[${resumeId}] Groq extraction complete — ` +
        `${extracted.skills?.length ?? 0} skills, ` +
        `${extracted.workExperience?.length ?? 0} roles`,
      );

      // ── Stage 3: Validate LLM output before persisting ───────────────────
      if (!extracted.personalInfo) {
        throw new Error('LLM response missing personalInfo — likely malformed JSON');
      }

      // ── Stage 4: Persist analysis to DB ──────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 3: persisting to database`);

      await this.prisma.resumeAnalysis.create({
        data: {
          resumeId,
          rawText,
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
          status:          'completed',
          processedAt:     new Date(),
        },
      });

      // ── Stage 5: Sync candidate profile ──────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 4: syncing candidate profile`);
      await this.syncCandidateProfile(resumeId, extracted);

      // ── Stage 6: Mark resume as analyzed ─────────────────────────────────
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'analyzed', content: rawText },
      });

      this.logger.log(`[${resumeId}] ✅ Analysis pipeline complete`);

    } catch (err) {
      const error = err as Error;

      this.logger.error(
        `[${resumeId}] ❌ Analysis failed\n` +
        `  Message: ${error.message}\n` +
        `  Stack:   ${error.stack?.split('\n')[1]?.trim() ?? 'N/A'}`,
      );

      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      // Re-throw so BullMQ can record the failure and trigger retries
      throw err;
    }
  }

  // ── Candidate profile sync ────────────────────────────────────────────────

  private async syncCandidateProfile(
    resumeId: string,
    data:     ExtractedResume,
  ): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      this.logger.warn(`[${resumeId}] Resume not found during profile sync`);
      return;
    }

    const currentRole = data.workExperience.find(w => w.isCurrent)
      ?? data.workExperience[0];

    await this.prisma.candidateProfile.upsert({
      where:  { userId: resume.userId },
      create: {
        userId:            resume.userId,
        headline:          currentRole
          ? `${currentRole.title} at ${currentRole.company}`
          : null,
        bio:               data.summary           ?? null,
        currentTitle:      currentRole?.title     ?? null,
        currentCompany:    currentRole?.company   ?? null,
        experienceYears:   data.experienceYears   ?? 0,
        experienceLevel:   data.experienceLevel   ?? 'junior',
        topSkills:         data.topSkills         ?? [],
        activeResumeId:    resumeId,
        profileCompletion: this.calculateCompletion(data),
      },
      update: {
        currentTitle:      currentRole?.title     ?? null,
        currentCompany:    currentRole?.company   ?? null,
        experienceYears:   data.experienceYears   ?? 0,
        experienceLevel:   data.experienceLevel   ?? 'junior',
        topSkills:         data.topSkills         ?? [],
        activeResumeId:    resumeId,
        profileCompletion: this.calculateCompletion(data),
      },
    });

    this.logger.log(`[${resumeId}] Candidate profile synced for user: ${resume.userId}`);
  }

  // ── Profile completion score ──────────────────────────────────────────────

  private calculateCompletion(data: ExtractedResume): number {
    const checks = [
      !!data.personalInfo?.name,
      !!data.personalInfo?.email,
      !!data.personalInfo?.phone,
      !!data.personalInfo?.location,
      !!data.personalInfo?.linkedin,
      data.workExperience?.length > 0,
      data.education?.length > 0,
      data.skills?.length > 0,
      !!data.summary,
      data.projects?.length > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
}