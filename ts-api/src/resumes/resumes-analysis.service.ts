/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
// src/resumes/resume-analysis.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LlmService} from '../ollama/Llm.service';
import { PrismaService } from '../../prisma/prisma.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import { Prisma } from '@prisma/client';

// ── Helper — converts typed arrays to Prisma-compatible JsonArray ──
function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}
// ── Type definitions ──────────────────────────────────────────────

interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string[];
  achievements: string[];
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear: number | null;
  gpa: string | null;
}

interface Skill {
  name: string;
  category: 'frontend' | 'backend' | 'devops' | 'database' | 'cloud' | 'soft' | 'other';
  proficiency: 1 | 2 | 3 | 4 | 5;
}

interface ExtractedResume {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
  };
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string | null;
  }>;
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
    repoUrl: string | null;
    liveUrl: string | null;
  }>;
  languages: Array<{
    language: string;
    proficiency: 'native' | 'fluent' | 'intermediate' | 'basic';
  }>;
  summary: string;
  experienceYears: number;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'principal';
  topSkills: string[];
  industryTags: string[];
  trajectory: string;
}

// ── System prompt ─────────────────────────────────────────────────

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

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);

  constructor(
    private readonly ollama: LlmService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Text extraction ──────────────────────────────────────────────

  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const result = await pdfParse(buffer);
      return result.text;
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new Error(`Unsupported MIME type for text extraction: ${mimetype}`);
  }

  // ── Main analysis pipeline ────────────────────────────────────────

  async analyzeResume(resumeId: string, buffer: Buffer, mimetype: string): Promise<void> {
    this.logger.log(`Starting analysis for resume: ${resumeId}`);

    // Mark as processing
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { status: 'processing' },
    });

    try {
      // Stage 1: Extract raw text
      this.logger.log(`Extracting text from ${mimetype}`);
      const rawText = await this.extractText(buffer, mimetype);
      this.logger.log(`Extracted ${rawText.length} characters`);

      if (rawText.trim().length < 50) {
        throw new Error('Extracted text is too short — file may be scanned/image-based');
      }

      // Stage 2: Ollama inference
      this.logger.log(`Sending to Ollama for structured extraction`);
      const extracted = await this.ollama.extractJson<ExtractedResume>(
        EXTRACTION_SYSTEM_PROMPT,
        `Parse this resume:\n\n${rawText.slice(0, 8000)}`, // Token limit guard
      );

      this.logger.log(`Extraction complete — ${extracted.skills.length} skills, ${extracted.workExperience.length} roles`);

      // Stage 3: Persist analysis
      await this.prisma.resumeAnalysis.create({
  data: {
    resumeId,
    rawText,
    personalInfo:    toJson(extracted.personalInfo),
    workExperience:  toJson(extracted.workExperience),
    education:       toJson(extracted.education),
    skills:          toJson(extracted.skills),
    certifications:  toJson(extracted.certifications),
    projects:        toJson(extracted.projects),
    languages:       toJson(extracted.languages),
    experienceYears: extracted.experienceYears,
    experienceLevel: extracted.experienceLevel,
    topSkills:       extracted.topSkills,
    industryTags:    extracted.industryTags,
    trajectory:      extracted.trajectory,
    status:          'completed',
    processedAt:     new Date(),
  },
});

      // Stage 4: Sync to candidate profile
      await this.syncCandidateProfile(resumeId, extracted);

      // Stage 5: Mark resume as analyzed
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { status: 'analyzed', content: rawText },
      });

      this.logger.log(`Analysis pipeline complete for resume: ${resumeId}`);

    } catch (err) {
      this.logger.error(`Analysis failed for resume ${resumeId}: ${err.message}`);
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { status: 'failed' },
      });
      throw err;
    }
  }

  // ── Profile sync ─────────────────────────────────────────────────

  private async syncCandidateProfile(
    resumeId: string,
    data: ExtractedResume,
  ): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) return;

    const currentRole = data.workExperience.find((w) => w.isCurrent) 
      ?? data.workExperience[0];

    await this.prisma.candidateProfile.upsert({
      where: { userId: resume.userId },
      create: {
        userId:          resume.userId,
        headline:        currentRole ? `${currentRole.title} at ${currentRole.company}` : null,
        bio:             data.summary,
        currentTitle:    currentRole?.title ?? null,
        currentCompany:  currentRole?.company ?? null,
        experienceYears: data.experienceYears,
        experienceLevel: data.experienceLevel,
        topSkills:       data.topSkills,
        activeResumeId:  resumeId,
        profileCompletion: this.calculateCompletion(data),
      },
      update: {
        currentTitle:    currentRole?.title ?? null,
        currentCompany:  currentRole?.company ?? null,
        experienceYears: data.experienceYears,
        experienceLevel: data.experienceLevel,
        topSkills:       data.topSkills,
        activeResumeId:  resumeId,
        profileCompletion: this.calculateCompletion(data),
      },
    });

    this.logger.log(`Candidate profile synced for user: ${resume.userId}`);
  }

  private calculateCompletion(data: ExtractedResume): number {
    const checks = [
      !!data.personalInfo.name,
      !!data.personalInfo.email,
      !!data.personalInfo.phone,
      !!data.personalInfo.location,
      !!data.personalInfo.linkedin,
      data.workExperience.length > 0,
      data.education.length > 0,
      data.skills.length > 0,
      !!data.summary,
      data.projects.length > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
}