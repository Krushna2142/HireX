/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
// ts-api/src/interviews/interviews.service.ts
@Injectable()
export class InterviewsService {
  private readonly pythonUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.pythonUrl = this.config.get<string>('pythonApiUrl') || '';
    this.apiKey = this.config.get<string>('pythonApiKey') || '';
  }

  async generateResponse(
    messages: { role: string; content: string }[],
    role?: string,
    difficulty?: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.pythonUrl}/ai/interview/mock`,
          { messages, role, difficulty },
          { headers: { 'X-API-KEY': this.apiKey }, timeout: 30000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Interview error: ${error?.response?.data?.detail || error.message}`,
      );
    }
  }

  async generateScorecard(messages: { role: string; content: string }[]) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.pythonUrl}/ai/interview/scorecard`,
          { messages },
          { headers: { 'X-API-KEY': this.apiKey }, timeout: 30000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Scorecard error: ${error?.response?.data?.detail || error.message}`,
      );
    }
  }
}