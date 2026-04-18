// Mock Interview Service - For candidate practice
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';

@Injectable()
export class MockInterviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  /**
   * Start mock interview session
   */
  async startMockInterview(
    candidateId: string,
    jobTitle: string,
    topic: string,
    difficulty: 'junior' | 'mid' | 'senior' = 'mid',
  ) {
    const session = await this.prisma.mock_interview_sessions.create({
      data: {
        candidate_id: candidateId,
        job_title: jobTitle,
        topic,
        difficulty,
        status: 'active',
      },
    });

    // Generate first question
    const question = await this.aiService.generateMockQuestion(
      topic,
      difficulty,
    );

    return {
      sessionId: session.id,
      question: question.question,
      hints: question.hints,
      idealAnswerPoints: question.ideal_answer_points,
    };
  }

  /**
   * Get next mock interview question
   */
  async getNextQuestion(sessionId: string) {
    const session = await this.prisma.mock_interview_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Get previous answers for context
    const previousAnswers: string[] = []; // TODO: fetch from DB

    const question = await this.aiService.generateMockQuestion(
      session.topic,
      session.difficulty,
      previousAnswers,
    );

    return question;
  }

  /**
   * Submit answer and get evaluation
   */
  async submitAnswer(sessionId: string, answer: string) {
    const session = await this.prisma.mock_interview_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // TODO: Store answer in database

    // Generate feedback on answer
    const feedback = await this.aiService.generateFeedback(answer, {
      topic: session.topic,
      difficulty: session.difficulty,
    });

    return {
      feedback: feedback.feedback,
      recommendations: feedback.recommendations,
      confidenceScore: feedback.confidence_score,
    };
  }

  /**
   * Complete mock interview and get overall score
   */
  async completeMockInterview(sessionId: string) {
    const session = await this.prisma.mock_interview_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Update session status
    await this.prisma.mock_interview_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        // TODO: calculate overall_score
      },
    });

    return { sessionId, status: 'completed' };
  }
}