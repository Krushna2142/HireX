/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
// src/resumes/resumes-analysis.service.ts
//
// Resume analysis pipeline — orchestrates:
//   1. Text extraction  (pdf-parse / mammoth)
//   2. NLP analysis     (Python spaCy API — deterministic, purpose-built)
//   3. DB persistence   (Prisma → PostgreSQL)
//   4. Profile sync     (candidate_profiles table)
//
// Architecture note:
//   LLMs (Groq) are intentionally NOT used here.
//   spaCy NER is superior for structured extraction:
//     - Deterministic output
//     - No hallucination risk
//     - Faster inference
//     - Zero API cost

import { Injectable, Logger }  from '@nestjs/common';
import { PrismaService }       from '../../prisma/prisma.service';
import { PythonNlpService, NlpAnalysisResult } from './Python-Nlp.service';
import { Prisma }              from '@prisma/client';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

// ── Prisma JSON helper ────────────────────────────────────────────────────────

function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);

  constructor(
    private readonly nlp:    PythonNlpService,   // ✅ spaCy — not Groq
    private readonly prisma: PrismaService,
  ) {}

  // ── Text extraction ───────────────────────────────────────────────────────
  // Supports PDF, DOCX, DOC. Throws on unsupported types.

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

    throw new Error(
      `Unsupported MIME type for text extraction: ${mimetype}. ` +
      `Supported: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
    );
  }

  // ── Main analysis pipeline ────────────────────────────────────────────────

  async analyzeResume(
    resumeId: string,
    buffer:   Buffer,
    mimetype: string,
  ): Promise<void> {
    this.logger.log(
      `[${resumeId}] ── Analysis pipeline starting ──────────────────────────`,
    );
    this.logger.log(
      `[${resumeId}] File: ${mimetype} | ${buffer.length} bytes`,
    );

    // Mark as processing so frontend poll sees the state change immediately
    await this.prisma.resume.update({
      where: { id: resumeId },
      data:  { status: 'processing' },
    });

    try {

      // ── Stage 1: Extract raw text ─────────────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 1/4: Extracting text from file`);
      const rawText = await this.extractText(buffer, mimetype);
      this.logger.log(`[${resumeId}] Extracted ${rawText.length} characters`);

      if (rawText.trim().length < 50) {
        throw new Error(
          `Extracted text is too short (${rawText.trim().length} chars). ` +
          `The file may be a scanned image. Please use a text-based PDF.`,
        );
      }

      // ── Stage 2: Python spaCy NLP analysis ───────────────────────────────
      this.logger.log(
        `[${resumeId}] Stage 2/4: Sending to Python spaCy NLP API`,
      );

      // Slice to 12,000 chars — well within spaCy's processing window.
      // Most resumes are 500-3000 chars; this guard handles edge cases.
      const extracted: NlpAnalysisResult = await this.nlp.analyseResume(
        rawText.slice(0, 12_000),
      );

      this.logger.log(
        `[${resumeId}] spaCy extraction complete: ` +
        `${extracted.skills?.length ?? 0} skills | ` +
        `${extracted.workExperience?.length ?? 0} roles | ` +
        `${extracted.education?.length ?? 0} education | ` +
        `level: ${extracted.experienceLevel}`,
      );

      // ── Stage 3: Validate before persisting ──────────────────────────────
      // Catch malformed API responses before they corrupt the DB.
      if (!extracted.personalInfo) {
        throw new Error(
          'Python NLP API returned malformed response — missing personalInfo field',
        );
      }

      // ── Stage 4: Persist analysis to DB ──────────────────────────────────
      this.logger.log(`[${resumeId}] Stage 3/4: Persisting analysis to database`);

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
      this.logger.log(`[${resumeId}] Stage 4/4: Syncing candidate profile`);
      await this.syncCandidateProfile(resumeId, extracted);

      // ── Mark resume as analyzed ───────────────────────────────────────────
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'analyzed', content: rawText },
      });

      this.logger.log(
        `[${resumeId}] ✅ Analysis pipeline complete ──────────────────────────`,
      );

    } catch (err) {
      const error = err as Error;

      this.logger.error(
        `[${resumeId}] ❌ Analysis pipeline failed\n` +
        `  Stage:   ${this.inferFailedStage(error.message)}\n` +
        `  Message: ${error.message}\n` +
        `  Stack:   ${error.stack?.split('\n')[1]?.trim() ?? 'N/A'}`,
      );

      // Mark as failed so frontend shows error state and retry button
      await this.prisma.resume.update({
        where: { id: resumeId },
        data:  { status: 'failed' },
      });

      // Re-throw so BullMQ records the failure and can trigger retries
      throw err;
    }
  }

  // ── Candidate profile sync ────────────────────────────────────────────────
  // Keeps the candidate_profiles table in sync with the latest analysis.
  // Uses upsert — safe to call multiple times.

  private async syncCandidateProfile(
    resumeId:  string,
    extracted: NlpAnalysisResult,
  ): Promise<void> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      this.logger.warn(`[${resumeId}] Resume not found during profile sync — skipping`);
      return;
    }

    // Use most recent current role, fall back to first role
    const currentRole = extracted.workExperience?.find(w => w.isCurrent)
      ?? extracted.workExperience?.[0];

    const headline = currentRole
      ? `${currentRole.title} at ${currentRole.company}`
      : null;

    await this.prisma.candidateProfile.upsert({
      where:  { userId: resume.userId },
      create: {
        userId:            resume.userId,
        headline,
        bio:               extracted.summary           ?? null,
        currentTitle:      currentRole?.title          ?? null,
        currentCompany:    currentRole?.company        ?? null,
        experienceYears:   extracted.experienceYears   ?? 0,
        experienceLevel:   extracted.experienceLevel   ?? 'junior',
        topSkills:         extracted.topSkills         ?? [],
        activeResumeId:    resumeId,
        profileCompletion: this.calculateCompletion(extracted),
      },
      update: {
        headline,
        currentTitle:      currentRole?.title          ?? null,
        currentCompany:    currentRole?.company        ?? null,
        experienceYears:   extracted.experienceYears   ?? 0,
        experienceLevel:   extracted.experienceLevel   ?? 'junior',
        topSkills:         extracted.topSkills         ?? [],
        activeResumeId:    resumeId,
        profileCompletion: this.calculateCompletion(extracted),
      },
    });

    this.logger.log(
      `[${resumeId}] Candidate profile synced for userId: ${resume.userId}`,
    );
  }

  // ── Profile completion score ──────────────────────────────────────────────
  // 0-100 score based on how complete the extracted data is.
  // Displayed in the candidate profile UI.

  private calculateCompletion(data: NlpAnalysisResult): number {
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

  // ── Error stage inference ─────────────────────────────────────────────────
  // Makes logs much easier to scan — tells you which stage failed
  // without needing to read the full stack trace.

  private inferFailedStage(message: string): string {
    if (message.includes('text is too short') || message.includes('Unsupported MIME'))
      return 'Stage 1 — Text extraction';
    if (message.includes('NLP API') || message.includes('spaCy') || message.includes('ECONNREFUSED'))
      return 'Stage 2 — Python NLP analysis';
    if (message.includes('personalInfo') || message.includes('malformed'))
      return 'Stage 2 — NLP response validation';
    if (message.includes('Prisma') || message.includes('database') || message.includes('unique'))
      return 'Stage 3 — Database persistence';
    if (message.includes('profile') || message.includes('upsert'))
      return 'Stage 4 — Profile sync';
    return 'Unknown stage';
  }
}