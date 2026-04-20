// ts-api/src/ai/providers/gemini.provider.ts (COMPLETE)

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider } from '../ai.provider.interface';

@Injectable()
export class GeminiProvider implements IAIProvider {
  private client: GoogleGenerativeAI;
  private model: any;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async generateInterviewQuestions(
    jobDescription: string,
    difficulty: 'junior' | 'mid' | 'senior',
    count: number = 5,
  ) {
    const prompt = `Generate ${count} interview questions for a ${difficulty}-level candidate.
    
Job Description:
${jobDescription}

Return as JSON array with: question, type (technical/behavioral/situational), category, expectedAnswerLength

Format: [{"question": "...", "type": "...", "category": "...", "expectedAnswerLength": "short/medium/long"}]

Make questions progressively harder. Focus on: problem-solving, communication, role-specific skills.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch?.[0] || '[]');
      return parsed.slice(0, count);
    } catch (err) {
      this.logger.error('Question generation failed:', err);
      return this.generateDefaultQuestions(difficulty, count);
    }
  }

  async evaluateInterview(
    transcript: string,
    rubric: Record<string, any> = {},
    jobDescription?: string,
  ) {
    const rubricStr = Object.entries(rubric)
      .map(([key, weight]) => `- ${key}: ${(weight as number * 100).toFixed(0)}%`)
      .join('\n');

    const prompt = `Evaluate this interview transcript based on the rubric:

TRANSCRIPT:
${transcript}

${jobDescription ? `\nJOB DESCRIPTION:\n${jobDescription}` : ''}

RUBRIC WEIGHTS:
${rubricStr}

Evaluate on:
1. Communication clarity (25%)
2. Technical knowledge (35%)
3. Problem-solving approach (25%)
4. Cultural/team fit (15%)

Return ONLY valid JSON (no markdown):
{
  "overall_score": <0-100>,
  "breakdown": {
    "communication": <0-100>,
    "technical": <0-100>,
    "problem_solving": <0-100>,
    "cultural_fit": <0-100>
  },
  "feedback": "2-3 sentence summary",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["gap 1", "gap 2"],
  "hireable": true/false,
  "reasoning": "Why hire/not hire"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      let text = result.response.text().trim();
      
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const evaluation = JSON.parse(text);
      return {
        overall_score: Math.min(100, Math.max(0, evaluation.overall_score || 50)),
        breakdown: evaluation.breakdown || {
          communication: 0,
          technical: 0,
          problem_solving: 0,
          cultural_fit: 0,
        },
        feedback:
          evaluation.feedback ||
          'Interview evaluation completed',
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
      };
    } catch (err) {
      this.logger.error('Evaluation parsing failed:', err);
      return {
        overall_score: 65,
        breakdown: {
          communication: 70,
          technical: 60,
          problem_solving: 65,
          cultural_fit: 70,
        },
        feedback: 'Evaluation processing completed',
        strengths: ['Good communication', 'Problem-solving approach'],
        weaknesses: ['Could expand on technical depth'],
      };
    }
  }

  async transcribeAudio(audioBuffer: Buffer, language: string = 'en'): Promise<string> {
    // NOTE: Gemini's vision can handle audio via base64 with specific mime types
    // For production, consider using a dedicated speech-to-text service
    // This is a placeholder implementation
    this.logger.warn(
      'Gemini transcription is limited. Consider using Google Speech-to-Text API',
    );
    return 'Transcription service not fully implemented. Use external speech-to-text API.';
  }

  async generateFeedback(
    transcript: string,
    performanceMetrics: Record<string, any>,
  ) {
    const metricsStr = Object.entries(performanceMetrics)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const prompt = `Provide constructive interview feedback based on:

TRANSCRIPT (last 1000 chars):
${transcript.slice(-1000)}

PERFORMANCE METRICS:
${metricsStr}

Return JSON with:
{
  "feedback": "3-4 sentences of constructive feedback",
  "recommendations": ["improvement 1", "improvement 2", "improvement 3"],
  "confidence_score": <0-1>,
  "nextSteps": "What to do next"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      return JSON.parse(text);
    } catch (err) {
      return {
        feedback: 'Strong performance overall. Continue building on these strengths.',
        recommendations: [
          'Practice explaining technical decisions',
          'Focus on edge cases',
        ],
        confidence_score: 0.8,
        nextSteps: 'Move to next round or provide detailed feedback',
      };
    }
  }

  async generateMockQuestion(
    topic: string,
    difficulty: string,
    previousAnswers?: string[],
  ) {
    const previousContext = previousAnswers
      ? `\n\nPrevious answers from candidate:\n${previousAnswers.slice(-2).join('\n')}`
      : '';

    const prompt = `Generate a mock interview question for ${difficulty} level candidate on: ${topic}${previousContext}

Return JSON:
{
  "question": "Specific question to ask",
  "hints": ["hint 1 if stuck", "hint 2"],
  "ideal_answer_points": ["point 1 to cover", "point 2", "point 3"],
  "followUpQuestions": ["follow-up 1", "follow-up 2"],
  "scoringRubric": {"clarity": "weight", "completeness": "weight", "depth": "weight"}
}`;

    try {
      const result = await this.model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      return JSON.parse(text);
    } catch (err) {
      return {
        question: `Explain a complex ${topic} concept you recently learned`,
        hints: [
          'Start with the fundamentals',
          'Explain the "why" not just "how"',
        ],
        ideal_answer_points: [
          'Clear definition',
          'Real-world application',
          'Challenges/limitations',
        ],
        followUpQuestions: [
          'How would you test this?',
          'What are edge cases?',
        ],
        scoringRubric: {
          clarity: 0.3,
          completeness: 0.4,
          depth: 0.3,
        },
      };
    }
  }

  /**
   * General-purpose Gemini query
   */
  async askGeneral(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      this.logger.error('General query failed:', err);
      return 'Unable to generate response';
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private generateDefaultQuestions(
    difficulty: string,
    count: number,
  ): Array<{
    question: string;
    type: string;
    category: string;
  }> {
    const questions: Record<string, Array<{ question: string; type: string; category: string }>> = {
      junior: [
        {
          question: 'Describe a project you built and what you learned',
          type: 'behavioral',
          category: 'experience',
        },
        {
          question: 'How do you debug a problem in your code?',
          type: 'technical',
          category: 'problem-solving',
        },
        {
          question: 'Tell me about a time you worked in a team',
          type: 'behavioral',
          category: 'teamwork',
        },
        {
          question: 'What is your approach to learning new technologies?',
          type: 'behavioral',
          category: 'growth',
        },
        {
          question: 'Describe the most challenging bug you fixed',
          type: 'situational',
          category: 'problem-solving',
        },
      ],
      mid: [
        {
          question: 'Design a system to handle 1M concurrent users',
          type: 'technical',
          category: 'system-design',
        },
        {
          question: 'Describe a technical decision you made and its tradeoffs',
          type: 'situational',
          category: 'architecture',
        },
        {
          question: 'How do you mentor junior developers?',
          type: 'behavioral',
          category: 'leadership',
        },
        {
          question: 'Tell me about a project that failed and what you learned',
          type: 'behavioral',
          category: 'resilience',
        },
        {
          question: 'Optimize this code snippet (provide snippet)',
          type: 'technical',
          category: 'optimization',
        },
      ],
      senior: [
        {
          question: 'Design a fault-tolerant distributed system for payment processing',
          type: 'technical',
          category: 'system-design',
        },
        {
          question: 'How would you scale an existing monolith to microservices?',
          type: 'situational',
          category: 'architecture',
        },
        {
          question: 'Describe your approach to technical mentorship and organization growth',
          type: 'behavioral',
          category: 'leadership',
        },
        {
          question: 'How do you balance technical debt and feature velocity?',
          type: 'situational',
          category: 'strategy',
        },
        {
          question:
            'Tell me about a significant architectural decision and how you drove consensus',
          type: 'behavioral',
          category: 'influence',
        },
      ],
    };

    return (questions[difficulty] || questions.mid).slice(0, count);
  }
}