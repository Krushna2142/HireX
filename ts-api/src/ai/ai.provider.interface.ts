// AI Provider Interface - Abstraction layer for easy provider swap
export interface IAIProvider {
  // Question generation
  generateInterviewQuestions(
    jobDescription: string,
    difficulty: 'junior' | 'mid' | 'senior',
    count?: number,
  ): Promise<{ question: string; type: string; category: string }[]>;

  // Transcript analysis & evaluation
  evaluateInterview(
    transcript: string,
    rubric: Record<string, any>,
    jobDescription?: string,
  ): Promise<{
    overall_score: number;
    breakdown: Record<string, number>;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
  }>;

  // Transcribe audio
  transcribeAudio(audioBuffer: Buffer, language?: string): Promise<string>;

  // Generate feedback
  generateFeedback(
    transcript: string,
    performanceMetrics: Record<string, any>,
  ): Promise<{
    feedback: string;
    recommendations: string[];
    confidence_score: number;
  }>;

  // Mock interview question
  generateMockQuestion(
    topic: string,
    difficulty: string,
    previousAnswers?: string[],
  ): Promise<{
    question: string;
    hints: string[];
    ideal_answer_points: string[];
    followUpQuestions?: string[];
  }>;

  // General-purpose provider prompt
  askGeneral(prompt: string): Promise<string>;
}
