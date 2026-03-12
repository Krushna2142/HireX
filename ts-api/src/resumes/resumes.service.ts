/* eslint-disable prettier/prettier */
// ts-api/src/resumes/resumes.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../database/database.service';
// ✅ FIX: Use require() for form-data with nodenext moduleResolution
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormData = require('form-data');

@Injectable()
export class ResumesService {
  private readonly pythonUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.pythonUrl = this.config.get<string>('pythonApiUrl') || '';
    this.apiKey = this.config.get<string>('pythonApiKey') || '';
  }

  /**
   * Upload file to Python AI service → get analysis → save to DB
   */
  async uploadAndAnalyze(file: Express.Multer.File, userId: string) {
    // 1. Forward file to Python API for parsing + AI analysis
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    let analysis: any;
    try {
      const response = await firstValueFrom(
        this.http.post(`${this.pythonUrl}/api/analyze/upload`, form, {
          headers: {
            ...form.getHeaders(),
            'X-API-KEY': this.apiKey,
          },
          timeout: 30000,
          maxContentLength: 10 * 1024 * 1024,
        }),
      );
      analysis = response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `AI analysis failed: ${error?.response?.data?.detail || error.message}`,
      );
    }

    // 2. Save to database
    const resumeText = analysis.resume_text || '';
    delete analysis.resume_text;

    try {
      const result = await this.db.query(
        `INSERT INTO resumes (user_id, file_name, content, analysis, status, created_at)
         VALUES ($1, $2, $3, $4, 'completed', NOW())
         RETURNING id, file_name, analysis, status, created_at`,
        [userId, file.originalname, resumeText, JSON.stringify(analysis)],
      );

      return {
        resume: result.rows[0],
        analysis,
      };
    } catch (dbError: any) {
      return { analysis, db_error: 'Could not save to database' };
    }
  }

  /**
   * Analyze from text — for ATS checker page
   */
  async analyzeText(resumeText: string, jobDescription?: string) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.pythonUrl}/api/analyze/text`,
          { resume_text: resumeText, job_description: jobDescription || '' },
          { headers: { 'X-API-KEY': this.apiKey }, timeout: 30000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `AI analysis failed: ${error?.response?.data?.detail || error.message}`,
      );
    }
  }

  /**
   * Quick ATS check — instant, no AI
   */
  async atsCheck(resumeText: string, jobDescription?: string) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.pythonUrl}/api/analyze/ats-check`,
          { resume_text: resumeText, job_description: jobDescription || '' },
          { headers: { 'X-API-KEY': this.apiKey }, timeout: 10000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `ATS check failed: ${error?.response?.data?.detail || error.message}`,
      );
    }
  }

  /**
   * List user's resume analyses
   */
  async listByUser(userId: string) {
    const result = await this.db.query(
      `SELECT id, file_name, analysis, status, created_at
       FROM resumes WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );
    return result.rows;
  }
}