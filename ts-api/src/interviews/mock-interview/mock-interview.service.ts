// ts-api/src/interviews/mock-interview/mock-interview.service.ts (COMPLETE)

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';

@Injectable()
export class MockInterviewService {
  private readonly logger = new Logger(MockInterviewService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  /**
   * Start a new mock interview session
   */
  async startSession(
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
        total_questions: 5,
      },
    });

    this.logger.log(`Mock interview started: ${session.id}`);

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
      followUpQuestions: question.followUpQuestions,
    };
  }

  /**
   * Get next question in session
   */
  async getNextQuestion(sessionId: string) {
    const session = await this.prisma.mock_interview_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get previous answers for context
    const previousAnswers = await this.prisma.mock_interview_answers.findMany({
      where: { session_id: sessionId },
      select: { user_answer: true },
      take: 3,
      orderBy: { submitted_at: 'desc' },
    });

    const contextAnswers = previousAnswers.map((a) => a.user_answer);

    // Generate next question
    const question = await this.aiService.generateMockQuestion(
      session.topic,
      session.difficulty,
      contextAnswers,
    );

    return {
      question: question.question,
      hints: question.hints,
      idealAnswerPoints: question.ideal_answer_points,
      difficulty: session.difficulty,
    };
  }

  /**
   * Submit answer and get AI evaluation
   */
  async submitAnswer(sessionId: string, answerText: string) {
    const session = await this.prisma.mock_interview_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Store answer
    const answer = await this.prisma.mock_interview_answers.create({
      data: {
        session_id: sessionId,
        question_number: session.completed_questions + 1,
        question: 'User submitted answer',
        user_answer: answerText,
        submitted_at: new Date(),
      },
    });

    // Generate feedback using AI
    const feedback = await this.aiService.generateFeedback(
      answerText,
      {
        topic: session.topic,
        difficulty: session.difficulty,
      },
    );

    // Score the answer (0-100)
    const answerScore = await this.scoreAnswer(answerText, session.topic);

    // Update answer with feedback and score
    const updatedAnswer = await this.prisma.mock_interview_answers.update({
      where: { id: answer.id },
      data: {
        ai_feedback: feedback.feedback,
        answer_score: answerScore,
      },
    });

    // Update session progress
    await this.prisma.mock_interview_sessions.update({
      where: { id: sessionId },
      data: {
        completed_questions: { increment: 1 },
      },
    });

    return {
      answerId: updatedAnswer.id,
      feedback: feedback.feedback,
      score: answerScore,
      recommendations: feedback.recommendations,
      shouldContinue: session.completed_questions < session.total_questions - 1,
    };
  }

  /**
   * Score a mock interview answer
   */
  private async scoreAnswer(answerText: string, topic: string): Promise<number> {
    // Simple length-based scoring + keyword matching
    const minWords = 20;
    const words = answerText.trim().split(/\s+/).length;

    let score = Math.min(100, (words / minWords) * 50); // 50% for length

    // Add bonus for key indicators
    if (
      answerText.toLowerCase().includes('because') ||
      answerText.toLowerCase().includes('example') ||
      answerText.toLowerCase().includes('approach')
    ) {
      score += 20;
    }

    if (
      answerText.toLowerCase().includes('challenge') ||
      answerText.toLowerCase().includes('solution') ||
      answerText.toLowerCase().includes('learned')
    ) {
      score += 15;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Complete session and calculate overall score
   */
  async completeSession(sessionId: string) {
    const session = await this.prisma.mock_interview_sessions.findUnique({
      where: { id: sessionId },
      include: { mock_interview_answers: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Calculate overall score
    const answers = session.mock_interview_answers;
    const scoredAnswers = answers.filter((a) => a.answer_score !== null);

    const overallScore =
      scoredAnswers.length > 0
        ? Math.round(
            scoredAnswers.reduce((sum, a) => sum + (a.answer_score || 0), 0) /
              scoredAnswers.length,
          )
        : 0;

    // Update session
    const completed = await this.prisma.mock_interview_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        overall_score: overallScore,
        completed_at: new Date(),
      },
    });

    this.logger.log(`Mock interview completed: ${sessionId} (score: ${overallScore})`);

    return {
      sessionId: completed.id,
      status: 'completed',
      overallScore,
      questionsAnswered: completed.completed_questions,
      summary: this.generateSummary(overallScore, session.difficulty),
    };
  }

  /**
   * Get session history for candidate
   */
  async getSessionHistory(candidateId: string) {
    return this.prisma.mock_interview_sessions.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }

  private generateSummary(score: number, difficulty: string): string {
    if (score >= 85) {
      return `Excellent performance! Ready for ${difficulty} level role interviews.`;
    } else if (score >= 70) {
      return `Good job! With more practice, you'll be ready for ${difficulty} roles.`;
    } else if (score >= 55) {
      return `Solid start. Focus on examples and detailed explanations.`;
    } else {
      return `Keep practicing! Focus on structured answers with real examples.`;
    }
  }
}