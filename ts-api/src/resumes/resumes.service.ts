/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/resumes/resumes.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ResumeAnalysisStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';

const RESUME_BUCKET = 'resumes';

type ResumeListRow = {
  id: string;
  userId: string;
  storageBucket: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string | null;
  sizeBytes: bigint | null;
  analysisStatus: ResumeAnalysisStatus;
  analysisError?: string | null;
  analyzedAt?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
};

type PythonResumeAnalysis = {
  resumeId?: string | null;
  fileName?: string | null;
  analyzer?: string;
  analyzerVersion?: string;
  status?: 'COMPLETED' | 'FAILED';

  personalInfo?: Record<string, unknown>;
  rawTextPreview?: string;

  skills?: string[];
  topSkills?: string[];
  missingCoreSections?: string[];

  education?: string[];
  workExperience?: string[];
  projects?: Array<Record<string, unknown>>;
  certifications?: string[];

  experienceYears?: number;
  experienceLevel?: string;
  industryTags?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];

  atsScore?: number;
  sectionScore?: number;
  skillScore?: number;
  readabilityScore?: number;
  keywordScore?: number;

  notes?: string[];
};

function toJson<T>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data ?? null)) as Prisma.InputJsonValue;
}

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveRawResume(file: Express.Multer.File, userId: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is empty');
    }

    this.logger.log(
      `[upload] userId=${userId} file=${file.originalname} mime=${file.mimetype} size=${file.size}`,
    );

    this.logger.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'set' : 'missing'}`);
    this.logger.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'}`);
    this.logger.log(`PYTHON_API_URL: ${process.env.PYTHON_API_URL ? 'set' : 'missing'}`);

    const sanitized = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');

    const storagePath = `${userId}/${Date.now()}-${sanitized}`;
    const supabase = getSupabaseServiceClient();

    const { error: uploadError } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(`[upload] Supabase storage failed: ${uploadError.message}`);

      throw new InternalServerErrorException(
        `File upload failed: ${uploadError.message}`,
      );
    }

    this.logger.log(`[upload] File stored at: ${RESUME_BUCKET}/${storagePath}`);

    try {
      const resume = await this.prisma.resume.create({
        data: {
          userId,
          storageBucket: RESUME_BUCKET,
          storagePath,
          originalFileName: file.originalname,
          mimeType: file.mimetype || null,
          sizeBytes: BigInt(file.size),
          analysisStatus: ResumeAnalysisStatus.PENDING,
          analysisError: null,
        },
      });

      this.logger.log(`[upload] Resume record created: ${resume.id}`);

      return this.mapResumeForClient(resume);
    } catch (dbError: any) {
      this.logger.error(`[upload] DB insert failed: ${dbError.message}`);

      await supabase.storage.from(RESUME_BUCKET).remove([storagePath]);

      throw new InternalServerErrorException(
        `Database insert failed: ${dbError.message}`,
      );
    }
  }

  async triggerAnalysis(resumeId: string, userId: string) {
    this.logger.log(`[analyse] Python analysis requested: resumeId=${resumeId} userId=${userId}`);

    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${resumeId} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (resume.analysisStatus === ResumeAnalysisStatus.COMPLETED) {
      return {
        resumeId,
        status: 'analyzed',
        message: 'Resume has already been analysed',
      };
    }

    if (!resume.storagePath) {
      throw new BadRequestException(
        `Resume ${resumeId} has no associated file. Please re-upload your resume.`,
      );
    }

    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        analysisStatus: ResumeAnalysisStatus.PROCESSING,
        analysisError: null,
      },
    });

    try {
      const buffer = await this.downloadResumeBuffer(
        resume.storageBucket || RESUME_BUCKET,
        resume.storagePath,
      );

      const analysis = await this.callPythonResumeAnalyzer({
        resumeId,
        fileName: resume.originalFileName,
        mimeType: resume.mimeType ?? this.inferMimetype(resume.originalFileName),
        buffer,
      });

      await this.savePythonAnalysis(resumeId, userId, analysis);

      this.logger.log(
        `[analyse] Python analysis completed: resumeId=${resumeId} ats=${analysis.atsScore ?? 0} skills=${analysis.topSkills?.length ?? 0}`,
      );

      return {
        resumeId,
        status: 'analyzed',
        message: 'Resume analysed with JobCrawler Python AI service',
      };
    } catch (error: any) {
      this.logger.error(
        `[analyse] Python analysis failed: resumeId=${resumeId} error=${error.message}`,
      );

      await this.markResumeFailed(resumeId, error.message);

      throw new InternalServerErrorException(
        `Resume analysis failed: ${error.message}`,
      );
    }
  }

  async listByUser(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        userId: true,
        storageBucket: true,
        storagePath: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        analysisStatus: true,
        analysisError: true,
        analyzedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return resumes.map((resume) => this.mapResumeForClient(resume));
  }

  async getLatest(userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return resume ? this.mapResumeForClient(resume) : null;
  }

  async getById(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapResumeForClient(resume);
  }

  async getAnalysis(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      throw new NotFoundException(`Resume ${id} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const analysis = await this.prisma.resumeAnalysis.findUnique({
      where: { resumeId: id },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not ready yet');
    }

    return analysis;
  }

  private async downloadResumeBuffer(
    bucket: string,
    storagePath: string,
  ): Promise<Buffer> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (error || !data) {
      throw new Error(error?.message ?? 'Unable to download resume from storage');
    }

    const arrayBuffer = await data.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  private async callPythonResumeAnalyzer(params: {
    resumeId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<PythonResumeAnalysis> {
    const baseUrl = process.env.PYTHON_API_URL?.replace(/\/$/, '');
    const apiKey = process.env.PYTHON_API_KEY ?? '';

    if (!baseUrl) {
      throw new Error('PYTHON_API_URL is not configured');
    }

    const form = new FormData();

    form.append('resumeId', params.resumeId);
    form.append(
      'file',
      new Blob([new Uint8Array(params.buffer)], {
        type: params.mimeType,
      }),
      params.fileName,
    );

    const headers: Record<string, string> = {};

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`${baseUrl}/resume/analyze-file`, {
      method: 'POST',
      headers,
      body: form,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Python AI service returned ${response.status}: ${text.slice(0, 500)}`,
      );
    }

    const json = JSON.parse(text) as PythonResumeAnalysis;

    if (json.status === 'FAILED') {
      throw new Error('Python AI service marked analysis as FAILED');
    }

    return json;
  }

  private async savePythonAnalysis(
    resumeId: string,
    userId: string,
    analysis: PythonResumeAnalysis,
  ) {
    const now = new Date();

    const skills = this.cleanStringArray(analysis.skills);
    const topSkills = this.cleanStringArray(
      analysis.topSkills?.length ? analysis.topSkills : analysis.skills,
    );

    const industryTags = this.cleanStringArray(analysis.industryTags);
    const education = this.cleanStringArray(analysis.education);
    const workExperience = this.cleanStringArray(analysis.workExperience);
    const certifications = this.cleanStringArray(analysis.certifications);
    const projects = Array.isArray(analysis.projects) ? analysis.projects : [];

    const experienceYears = Number.isFinite(Number(analysis.experienceYears))
      ? Number(analysis.experienceYears)
      : 0;

    const experienceLevel = analysis.experienceLevel || 'fresher';
    const trajectory = this.buildTrajectory(analysis);

    await this.prisma.$transaction(async (tx) => {
      await tx.resumeAnalysis.upsert({
        where: { resumeId },
        create: {
          resumeId,
          rawText: analysis.rawTextPreview ?? '',
          personalInfo: toJson(analysis.personalInfo ?? {}),
          workExperience: toJson(workExperience),
          education: toJson(education),
          skills: toJson(skills),
          certifications: toJson(certifications),
          projects: toJson(projects),
          languages: toJson([]),
          experienceYears,
          experienceLevel,
          topSkills,
          industryTags,
          trajectory,
          status: ResumeAnalysisStatus.COMPLETED,
          processedAt: now,
        },
        update: {
          rawText: analysis.rawTextPreview ?? '',
          personalInfo: toJson(analysis.personalInfo ?? {}),
          workExperience: toJson(workExperience),
          education: toJson(education),
          skills: toJson(skills),
          certifications: toJson(certifications),
          projects: toJson(projects),
          languages: toJson([]),
          experienceYears,
          experienceLevel,
          topSkills,
          industryTags,
          trajectory,
          status: ResumeAnalysisStatus.COMPLETED,
          processedAt: now,
        },
      });

      await tx.resume.update({
        where: { id: resumeId },
        data: {
          extractedText: analysis.rawTextPreview ?? null,
          analysisStatus: ResumeAnalysisStatus.COMPLETED,
          analysisJson: toJson(analysis),
          analysisError: null,
          analyzedAt: now,
        },
      });

      await tx.jobseekerProfile.upsert({
        where: { userId },
        create: {
          userId,
          headline: this.buildHeadline(experienceLevel, topSkills),
          bio: this.buildBio(analysis),
          currentTitle: null,
          currentCompany: null,
          topSkills,
          targetIndustries: industryTags,
          experienceLevel,
          experienceYears,
          activeResumeId: resumeId,
          profileCompletion: this.calculateCompletion(analysis),
        },
        update: {
          headline: this.buildHeadline(experienceLevel, topSkills),
          bio: this.buildBio(analysis),
          currentTitle: null,
          currentCompany: null,
          topSkills,
          targetIndustries: industryTags,
          experienceLevel,
          experienceYears,
          activeResumeId: resumeId,
          profileCompletion: this.calculateCompletion(analysis),
          updatedAt: now,
        },
      });
    });
  }

  private async markResumeFailed(resumeId: string, message: string) {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        analysisStatus: ResumeAnalysisStatus.FAILED,
        analysisError: message,
      },
    });
  }

  private mapResumeForClient(resume: ResumeListRow) {
    return {
      id: resume.id,
      userId: resume.userId,
      storageBucket: resume.storageBucket,
      storagePath: resume.storagePath,
      originalFileName: resume.originalFileName,
      fileName: resume.originalFileName,
      rawFile: this.publicStorageUrl(resume.storageBucket, resume.storagePath),
      mimeType: resume.mimeType,
      sizeBytes: resume.sizeBytes?.toString() ?? null,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      analyzedAt: resume.analyzedAt,
      analysisError: resume.analysisError ?? null,
      status: this.toLegacyStatus(resume.analysisStatus),
      analysisStatus: resume.analysisStatus,
      analysisStatusLabel: this.toLegacyStatus(resume.analysisStatus),
    };
  }

  private publicStorageUrl(bucket: string, path: string): string | null {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');

    return url ? `${url}/storage/v1/object/public/${bucket}/${path}` : null;
  }

  private toLegacyStatus(status: ResumeAnalysisStatus): string {
    switch (status) {
      case ResumeAnalysisStatus.PROCESSING:
        return 'processing';
      case ResumeAnalysisStatus.COMPLETED:
        return 'analyzed';
      case ResumeAnalysisStatus.FAILED:
        return 'failed';
      case ResumeAnalysisStatus.PENDING:
      default:
        return 'uploaded';
    }
  }

  private inferMimetype(fileName: string): string {
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.pdf')) return 'application/pdf';

    if (lower.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    if (lower.endsWith('.doc')) return 'application/msword';

    return 'application/octet-stream';
  }

  private cleanStringArray(value?: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildTrajectory(analysis: PythonResumeAnalysis): string {
    const strengths = this.cleanStringArray(analysis.strengths);
    const recommendations = this.cleanStringArray(analysis.recommendations);
    const atsScore = analysis.atsScore ?? 0;

    const parts = [
      `ATS score: ${atsScore}/100.`,
      strengths.length ? `Strengths: ${strengths.slice(0, 3).join(', ')}.` : '',
      recommendations.length
        ? `Recommendations: ${recommendations.slice(0, 3).join(', ')}.`
        : '',
    ];

    return parts.filter(Boolean).join(' ');
  }

  private buildHeadline(experienceLevel: string, topSkills: string[]): string | null {
    if (!topSkills.length) return `${experienceLevel} candidate`;

    return `${experienceLevel} candidate skilled in ${topSkills.slice(0, 4).join(', ')}`;
  }

  private buildBio(analysis: PythonResumeAnalysis): string | null {
    const strengths = this.cleanStringArray(analysis.strengths);
    const recommendations = this.cleanStringArray(analysis.recommendations);

    if (strengths.length) return strengths.join(' ');

    if (recommendations.length) return recommendations.join(' ');

    return analysis.atsScore
      ? `Resume analysed by JobCrawler custom Python AI service. ATS score: ${analysis.atsScore}/100.`
      : null;
  }

  private calculateCompletion(analysis: PythonResumeAnalysis): number {
    const personal = analysis.personalInfo ?? {};

    const checks = [
      Boolean(personal.name),
      Boolean(personal.email),
      Boolean(personal.phone),
      Boolean(personal.linkedin || personal.github || personal.portfolio),
      this.cleanStringArray(analysis.skills).length > 0,
      this.cleanStringArray(analysis.topSkills).length > 0,
      this.cleanStringArray(analysis.education).length > 0,
      this.cleanStringArray(analysis.workExperience).length > 0,
      Array.isArray(analysis.projects) && analysis.projects.length > 0,
      Number(analysis.atsScore ?? 0) > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
}