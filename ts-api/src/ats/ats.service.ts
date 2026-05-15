/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AtsScoreResponse = {
  atsScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
  breakdown: Record<string, number>;
};

type ScoreAgainstJobPayload = {
  resumeAnalysis: Record<string, unknown>;
  jobTitle?: string | null;
  jobDescription?: string | null;
  requiredSkills?: string[];
};

@Injectable()
export class AtsService {
  private readonly logger = new Logger(AtsService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    const value =
      this.config.get<string>('PYTHON_API_URL') ??
      this.config.get<string>('pythonApiUrl') ??
      '';

    return value.replace(/\/+$/, '');
  }

  private get apiKey() {
    return (
      this.config.get<string>('PYTHON_API_KEY') ??
      this.config.get<string>('pythonApiKey') ??
      ''
    );
  }

  async healthCheck(): Promise<boolean> {
    const baseUrl = this.baseUrl;

    if (!baseUrl) {
      this.logger.warn('PYTHON_API_URL is not configured.');
      return false;
    }

    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: this.headers(),
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        this.logger.warn(`Python health check failed: ${response.status}`);
        return false;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        this.logger.warn(`Python health returned non-json content-type=${contentType}`);
        return false;
      }

      const data = await response.json();
      return data?.status === 'healthy' || data?.status === 'ok';
    } catch (error) {
      this.logger.warn(
        `Python health check error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async scoreAgainstJob(payload: ScoreAgainstJobPayload): Promise<AtsScoreResponse> {
    const baseUrl = this.baseUrl;

    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'Python ATS service is not configured. Set PYTHON_API_URL in ts-api environment.',
      );
    }

    const healthy = await this.healthCheck();

    if (!healthy) {
      throw new ServiceUnavailableException(
        'Python ATS service is currently unavailable. Retry after the Render service wakes up.',
      );
    }

    try {
      const response = await fetch(`${baseUrl}/resume/score-against-job`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          resumeAnalysis: payload.resumeAnalysis ?? {},
          jobTitle: payload.jobTitle ?? '',
          jobDescription: payload.jobDescription ?? '',
          requiredSkills: payload.requiredSkills ?? [],
        }),
        signal: AbortSignal.timeout(20_000),
      });

      const contentType = response.headers.get('content-type') ?? '';

      if (!response.ok) {
        const body = await response.text();

        this.logger.error(
          `Python ATS returned ${response.status}. body=${this.safePreview(body)}`,
        );

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new ServiceUnavailableException(
            'Python ATS service is temporarily unavailable. Please retry in a few seconds.',
          );
        }

        throw new BadGatewayException(
          `Python ATS service rejected the request with status ${response.status}.`,
        );
      }

      if (!contentType.includes('application/json')) {
        const body = await response.text();

        this.logger.error(
          `Python ATS returned non-json content-type=${contentType}. body=${this.safePreview(body)}`,
        );

        throw new BadGatewayException(
          'Python ATS service returned invalid response format.',
        );
      }

      const data = (await response.json()) as Partial<AtsScoreResponse>;

      return this.normalizeAtsResult(data);
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      this.logger.error(
        `Python ATS request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw new ServiceUnavailableException(
        'Unable to connect to Python ATS service. Please retry.',
      );
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  private normalizeAtsResult(data: Partial<AtsScoreResponse>): AtsScoreResponse {
    const score = Number(data.atsScore ?? 0);
    const recommendation = String(data.recommendation ?? 'REVIEW').toUpperCase();

    return {
      atsScore: Number.isFinite(score)
        ? Math.max(0, Math.min(100, Math.round(score)))
        : 0,
      recommendation:
        recommendation === 'SHORTLIST' || recommendation === 'REJECT'
          ? recommendation
          : 'REVIEW',
      matchedSkills: Array.isArray(data.matchedSkills)
        ? data.matchedSkills.map(String)
        : [],
      missingSkills: Array.isArray(data.missingSkills)
        ? data.missingSkills.map(String)
        : [],
      reason:
        typeof data.reason === 'string'
          ? data.reason
          : 'ATS score generated by JobCrawler Python service.',
      breakdown:
        data.breakdown && typeof data.breakdown === 'object'
          ? data.breakdown
          : {},
    };
  }

  private safePreview(value: string) {
    return value.replace(/\s+/g, ' ').slice(0, 350);
  }
}