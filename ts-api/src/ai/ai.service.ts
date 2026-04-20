// ts-api/src/ai/ai.service.ts (COMPLETE IMPLEMENTATION)

import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { IAIProvider } from './ai.provider.interface';

@Injectable()
export class AIService {
  private provider: IAIProvider;
  private readonly logger = new Logger(AIService.name);

  constructor(private geminiProvider: GeminiProvider) {
    this.provider = this.geminiProvider;
  }

  /**
   * Generate interview questions for a specific job/difficulty
   */
  async generateInterviewQuestions(
    jobDescription: string,
    difficulty: 'junior' | 'mid' | 'senior' = 'mid',
    count: number = 5,
  ) {
    this.logger.debug(`Generating ${count} ${difficulty}-level questions`);
    return this.provider.generateInterviewQuestions(
      jobDescription,
      difficulty,
      count,
    );
  }

  /**
   * Evaluate interview performance from transcript
   * Returns score breakdown, feedback, strengths, weaknesses
   */
  async evaluateInterview(
    transcript: string,
    rubric: Record<string, any> = {
      communication: 0.25,
      technical: 0.35,
      problem_solving: 0.25,
      cultural_fit: 0.15,
    },
    jobDescription?: string,
  ) {
    this.logger.debug('Evaluating interview transcript');
    
    if (!transcript?.trim()) {
      return {
        overall_score: 0,
        breakdown: { communication: 0, technical: 0, problem_solving: 0, cultural_fit: 0 },
        feedback: 'No transcript provided',
        strengths: [],
        weaknesses: [],
      };
    }

    return this.provider.evaluateInterview(transcript, rubric, jobDescription);
  }

  /**
   * Transcribe audio to text
   * Uses Gemini's audio capabilities or external service
   */
  async transcribeAudio(audioBuffer: Buffer, language: string = 'en'): Promise<string> {
    this.logger.debug('Transcribing audio');
    return this.provider.transcribeAudio(audioBuffer, language);
  }

  /**
   * Generate detailed feedback for candidate
   */
  async generateFeedback(
    transcript: string,
    performanceMetrics: {
      communicationScore?: number;
      technicalScore?: number;
      confidenceScore?: number;
      packetLoss?: number;
      latency?: number;
    },
  ) {
    this.logger.debug('Generating feedback');
    return this.provider.generateFeedback(transcript, performanceMetrics);
  }

  /**
   * Generate mock interview question with hints
   */
  async generateMockQuestion(
    topic: string,
    difficulty: string,
    previousAnswers?: string[],
  ) {
    this.logger.debug(`Generating mock question: ${topic}`);
    return this.provider.generateMockQuestion(topic, difficulty, previousAnswers);
  }

  /**
   * Score candidate based on rubric
   * Combines interview evaluation with metrics
   */
  async scoreCandidate(
    transcript: string,
    rubric: Record<string, any>,
    jobDescription?: string,
    connectionMetrics?: {
      packetLoss?: number;
      latency?: number;
    },
  ) {
    this.logger.debug('Scoring candidate');
    
    const evaluation = await this.evaluateInterview(
      transcript,
      rubric,
      jobDescription,
    );

    // Adjust score slightly for technical connectivity issues
    // (don't penalize candidate for network problems)
    let technicalAdjustment = 0;
    if (connectionMetrics?.packetLoss && connectionMetrics.packetLoss > 5) {
      technicalAdjustment = -5; // Minor adjustment
    }

    const finalScore = Math.max(
      0,
      Math.min(100, evaluation.overall_score + technicalAdjustment),
    );

    return {
      overall_score: finalScore,
      breakdown: evaluation.breakdown,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      timestamp: new Date(),
    };
  }

  /**
   * Generate AI-powered suggested next questions during interview
   * Used for recruiter assist panel
   */
  async suggestFollowUpQuestion(
    currentTranscript: string,
    jobDescription: string,
    candidateLevel: 'junior' | 'mid' | 'senior',
  ) {
    this.logger.debug('Generating follow-up question suggestion');

    const prompt = `
Based on this interview transcript, suggest ONE follow-up question to dig deeper:

Transcript: ${currentTranscript.slice(-500)} (last 500 chars)

Job Description: ${jobDescription.slice(0, 300)}

Candidate Level: ${candidateLevel}

Return JSON:
{
  "question": "specific follow-up question",
  "rationale": "why this question",
  "expectedAnswerTheme": "what to listen for"
}
    `;

    const result = await this.provider.askGeneral(prompt);
    try {
      return JSON.parse(result);
    } catch {
      return {
        question: 'Tell me more about that experience',
        rationale: 'Explore depth',
        expectedAnswerTheme: 'Detail and impact',
      };
    }
  }

  /**
   * General-purpose question to Gemini
   * Used for flexible AI assistance
   */
  async askGeneral(prompt: string): Promise<string> {
    return this.provider.askGeneral?.(prompt) || 'Unable to generate response';
  }
}