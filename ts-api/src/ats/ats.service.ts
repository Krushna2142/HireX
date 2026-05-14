/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/ats/ats.service.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AtsScoreRequest {
  resumeAnalysis: Record<string, unknown>;
  jobTitle?: string;
  jobDescription?: string;
  requiredSkills?: string[];
}

export interface AtsScoreResponse {
  atsScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
  breakdown: Record<string, number>;
}

@Injectable()
export class AtsService {
  private readonly logger = new Logger(AtsService.name);
  private readonly pythonUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.pythonUrl =
      this.config.get<string>('PYTHON_API_URL') ??
      this.config.get<string>('pythonApiUrl') ??
      '';

    this.apiKey =
      this.config.get<string>('PYTHON_API_KEY') ??
      this.config.get<string>('pythonApiKey') ??
      '';

    if (!this.pythonUrl) {
      this.logger.warn('PYTHON_API_URL is not configured. ATS scoring will fail until configured.');
    }
  }

  async scoreAgainstJob(payload: AtsScoreRequest): Promise<AtsScoreResponse> {
    if (!this.pythonUrl) {
      throw new InternalServerErrorException('PYTHON_API_URL is not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    try {
      const response = await fetch(
        `${this.pythonUrl.replace(/\/$/, '')}/resume/score-against-job`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        },
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`Python ATS service returned ${response.status}: ${text.slice(0, 500)}`);
      }

      return JSON.parse(text) as AtsScoreResponse;
    } catch (error: any) {
      this.logger.error(`ATS scoring failed: ${error.message}`);

      throw new InternalServerErrorException(
        `Failed to fetch ATS score from Python AI service: ${error.message}`,
      );
    }
  }

  async score(resumeText: string): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }> {
    const response = await this.scoreAgainstJob({
      resumeAnalysis: {
        rawTextPreview: resumeText,
        skills: [],
        topSkills: [],
        atsScore: 50,
        sectionScore: 50,
      },
      requiredSkills: [],
    });

    return {
      score: response.atsScore,
      strengths: response.matchedSkills,
      weaknesses: response.missingSkills,
      suggestions: [response.reason],
    };
  }
}