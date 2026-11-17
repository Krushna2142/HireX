// ts-api/src/interviews/mock-interview/mock-interview.service.ts
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

  /** Start a new mock interview session */
  async startSession(
    candidateId: string,
    jobTitle: string,
    topic: string,
    difficulty: 'junior' | 'mid' | 'senior' = 'mid',
  ) {
    const session = await this.prisma.mockInterviewSession.create({
      data: {
        candidateId,
        jobTitle,
        topic,
        difficulty,
        status: 'active',
        totalQuestions: 5,
      },
    });

    this.logger.log(`Mock interview started: ${session.id}`);

    const question = await this.aiService.generateMockQuestion(topic, difficulty);

    return {
      sessionId: session.id,
      question: question.question,
      hints: question.hints,
      idealAnswerPoints: question.ideal_answer_points,
      followUpQuestions: question.followUpQuestions,
    };
  }

  /** Get next question in session */
  async getNextQuestion(sessionId: string) {
    const session = await this.prisma.mockInterviewSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const previousAnswers = await this.prisma.mockInterviewAnswer.findMany({
      where: { sessionId },
      select: { userAnswer: true },
      take: 3,
      orderBy: { submittedAt: 'desc' },
    });

    const question = await this.aiService.generateMockQuestion(
      session.topic,
      session.difficulty,
      previousAnswers.map((a) => a.userAnswer),
    );

    return {
      question: question.question,
      hints: question.hints,
      idealAnswerPoints: question.ideal_answer_points,
      difficulty: session.difficulty,
    };
  }

  /** Submit answer and get AI evaluation */
  async submitAnswer(sessionId: string, answerText: string) {
    const session = await this.prisma.mockInterviewSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const answer = await this.prisma.mockInterviewAnswer.create({
      data: {
        sessionId,
        questionNumber: session.completedQuestions + 1,
        question: 'User submitted answer',
        userAnswer: answerText,
        submittedAt: new Date(),
      },
    });

    // AIService.generateFeedback accepts performance metrics only.
    const feedback = await this.aiService.generateFeedback(answerText, {});
    const answerScore = this.scoreAnswer(answerText);

    const updatedAnswer = await this.prisma.mockInterviewAnswer.update({
      where: { id: answer.id },
      data: {
        aiFeedback: feedback.feedback,
        answerScore,
      },
    });

    await this.prisma.mockInterviewSession.update({
      where: { id: sessionId },
      data: { completedQuestions: { increment: 1 } },
    });

    return {
      answerId: updatedAnswer.id,
      feedback: feedback.feedback,
      score: answerScore,
      recommendations: feedback.recommendations,
      shouldContinue: session.completedQuestions < session.totalQuestions - 1,
    };
  }

  /** Heuristic answer scoring (0-100) */
  private scoreAnswer(answerText: string): number {
    const minWords = 20;
    const words = answerText.trim().split(/\s+/).length;
    let score = Math.min(100, (words / minWords) * 50);

    const lower = answerText.toLowerCase();
    if (lower.includes('because') || lower.includes('example') || lower.includes('approach')) {
      score += 20;
    }
    if (lower.includes('challenge') || lower.includes('solution') || lower.includes('learned')) {
      score += 15;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /** Complete session and calculate overall score */
  async completeSession(sessionId: string) {
    const session = await this.prisma.mockInterviewSession.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const scored = session.answers.filter((a) => a.answerScore !== null);
    const overallScore = scored.length
      ? Math.round(
          scored.reduce((sum, a) => sum + (a.answerScore ?? 0), 0) / scored.length,
        )
      : 0;

    const completed = await this.prisma.mockInterviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        overallScore,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Mock interview completed: ${sessionId} (score: ${overallScore})`,
    );

    return {
      sessionId: completed.id,
      status: 'completed',
      overallScore,
      questionsAnswered: completed.completedQuestions,
      summary: this.generateSummary(overallScore, session.difficulty),
    };
  }

  /** Session history for a candidate */
  async getSessionHistory(candidateId: string) {
    return this.prisma.mockInterviewSession.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private generateSummary(score: number, difficulty: string): string {
    if (score >= 85) return `Excellent performance! Ready for ${difficulty} level role interviews.`;
    if (score >= 70) return `Good job! With more practice, you'll be ready for ${difficulty} roles.`;
    if (score >= 55) return 'Solid start. Focus on examples and detailed explanations.';
    return 'Keep practicing! Focus on structured answers with real examples.';
  }
}