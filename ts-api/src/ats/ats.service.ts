// src/ats/ats.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface AtsScoreResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

@Injectable()
export class AtsService {
  private readonly pythonUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.pythonUrl = this.config.get<string>('pythonApiUrl') ?? '';
    this.apiKey = this.config.get<string>('pythonApiKey') ?? '';

    if (!this.pythonUrl || !this.apiKey) {
      throw new Error('ATS Service: Missing Python API configuration');
    }
  }

  async score(resumeText: string): Promise<AtsScoreResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AtsScoreResponse>(
          `${this.pythonUrl}/ai/ats/score`,
          { resume_text: resumeText },
          {
            headers: {
              'X-API-KEY': this.apiKey,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch ATS score from AI service',
      );
    }
  }
}