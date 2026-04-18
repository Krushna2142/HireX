// Main AI Service - All AI calls go through here
import { Injectable } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { IAIProvider } from './ai.provider.interface';

@Injectable()
export class AIService {
  private provider: IAIProvider;

  constructor(private geminiProvider: GeminiProvider) {
    // Could swap providers here: this.provider = new AnthropicProvider()
    this.provider = this.geminiProvider;
  }

  /**
   * Generate interview questions
   */
  async generateInterviewQuestions(
    jobDescription: string,
    difficulty: 'junior' | 'mid' | 'senior' = 'mid',
    count?: number,
  ) {
    return this.provider.generateInterviewQuestions(
      jobDescription,
      difficulty,
      count,
    );
  }

  /**
   * Evaluate interview transcript
   */
  async evaluateInterview(
    transcript: string,
    rubric: Record<string, any>,
    jobDescription?: string,
  ) {
    return this.provider.evaluateInterview(
      transcript,
      rubric,
      jobDescription,
    );
  }

  /**
   * Transcribe audio
   */
  async transcribeAudio(audioBuffer: Buffer, language?: string) {
    return this.provider.transcribeAudio(audioBuffer, language);
  }

  /**
   * Generate feedback for candidate
   */
  async generateFeedback(
    transcript: string,
    performanceMetrics: Record<string, any>,
  ) {
    return this.provider.generateFeedback(transcript, performanceMetrics);
  }

  /**
   * Generate mock interview question
   */
  async generateMockQuestion(
    topic: string,
    difficulty: string,
    previousAnswers?: string[],
  ) {
    return this.provider.generateMockQuestion(
      topic,
      difficulty,
      previousAnswers,
    );
  }

  /**
   * Score candidate performance
   */
  async scoreCandidate(
    transcript: string,
    rubric: Record<string, any>,
    jobDescription?: string,
  ) {
    const evaluation = await this.evaluateInterview(
      transcript,
      rubric,
      jobDescription,
    );
    return {
      overall_score: evaluation.overall_score,
      breakdown: evaluation.breakdown,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      timestamp: new Date(),
    };
  }
}