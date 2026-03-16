/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/resumes/resumes-analysis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../../prisma/prisma.service';
import { LlmService }         from '../ollama/Llm.service';   // ← Groq, not Python
import { Prisma }             from '@prisma/client';

const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

// ── Prisma JSON helper ────────────────────────────────────────────────────────

function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

// ── What Groq returns — matches the system prompt schema exactly ──────────────

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
// Strict JSON-only instruction — mixtral-8x7b follows this reliably.

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
    private readonly llm:    LlmService,     // ← Groq LLM
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
    this.logger.log(`[${resumeId}] Starting Groq analysis — ${mimetype} — ${buffer.length} bytes`);

    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  { status: 'processing' },
    });

    try {
      // Stage 1: Extract raw text
      this.logger.log(`[${resumeId}] Stage 1: text extraction`);
      const rawText = await this.extractText(buffer, mimetype);
      this.logger.log(`[${resumeId}] Extracted ${rawText.length} chars`);

      if (rawText.trim().length < 50) {
        throw new Error(
          `Extracted text too short (${rawText.trim().length} chars). ` +
          `File may be a scanned image — use a text-based PDF.`,
        );
      }

      // Stage 2: Groq extraction
      this.logger.log(`[${resumeId}] Stage 2: sending to Groq (mixtral-8x7b)`);

      const extracted = await this.llm.extractJson<ResumeAnalysisResult>(
        SYSTEM_PROMPT,
        `Parse this resume and return JSON:\n\n${rawText.slice(0, 10_000)}`,
      );

      this.logger.log(
        `[${resumeId}] Stage 2 complete — ` +
        `${extracted.skills?.length ?? 0} skills | ` +
        `${extracted.workExperience?.length ?? 0} roles | ` +
        `level: ${extracted.experienceLevel}`,
      );

      if (!extracted?.personalInfo) {
        throw new Error('Groq returned malformed response — missing personalInfo');
      }

      // Stage 3: Persist analysis
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

      // Stage 4: Sync candidate profile BEFORE marking as analyzed
      // This is critical — frontend polls status and immediately calls
      // GET /jobs/recommendations. Profile must be committed first.
      this.logger.log(`[${resumeId}] Stage 4: syncing candidate profile`);
      await this.syncCandidateProfile(resumeId, extracted);

      // Stage 5: Mark as analyzed — only after profile is committed
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'analyzed', content: rawText },
      });

      this.logger.log(`[${resumeId}] ✅ Pipeline complete`);

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

      throw err; // re-throw so BullMQ records failure and retries
    }
  }

  // ── Sync extracted data into candidate_profiles ───────────────────────────

  private async syncCandidateProfile(
    resumeId: string,
    data:     ResumeAnalysisResult,
  ): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      this.logger.warn(`[${resumeId}] Resume not found during profile sync`);
      return;
    }

    const currentRole =
      data.workExperience?.find(w => w.isCurrent) ??
      data.workExperience?.[0];

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

    this.logger.log(`[${resumeId}] Profile synced — userId: ${resume.userId}`);
  }

  // ── Profile completion score (0–100) ─────────────────────────────────────

  private calculateCompletion(data: ResumeAnalysisResult): number {
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
}