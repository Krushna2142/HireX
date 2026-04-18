// Gemini API Implementation
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider } from '../ai.provider.interface';

@Injectable()
export class GeminiProvider implements IAIProvider {
  private client: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
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
    const prompt = `
      Generate ${count} interview questions for a ${difficulty} level candidate.
      Job Description: ${jobDescription}
      
      Return as JSON array with fields: question, type (technical/behavioral), category
      Format: [{"question": "...", "type": "...", "category": "..."}]
    `;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch?.[0] || '[]');
    } catch {
      return [];
    }
  }

  async evaluateInterview(
    transcript: string,
    rubric: Record<string, any>,
    jobDescription?: string,
  ) {
    const prompt = `
      Evaluate this interview transcript based on the rubric.
      
      Transcript: ${transcript}
      Rubric: ${JSON.stringify(rubric)}
      ${jobDescription ? `Job Description: ${jobDescription}` : ''}
      
      Provide JSON response:
      {
        "overall_score": <0-100>,
        "breakdown": {"communication": <0-100>, "technical": <0-100>, ...},
        "feedback": "summary",
        "strengths": ["..."],
        "weaknesses": ["..."]
      }
    `;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch?.[0] || '{}');
    } catch {
      return {
        overall_score: 0,
        breakdown: {},
        feedback: 'Unable to evaluate',
        strengths: [],
        weaknesses: [],
      };
    }
  }

  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<string> {
    // NOTE: Gemini doesn't have built-in audio transcription
    // Use Google Speech-to-Text API or mock implementation
    // For now, return placeholder
    return 'Transcription not available in mock implementation';
  }

  async generateFeedback(
    transcript: string,
    performanceMetrics: Record<string, any>,
  ) {
    const prompt = `
      Based on this interview transcript and performance metrics, generate constructive feedback.
      
      Transcript: ${transcript}
      Metrics: ${JSON.stringify(performanceMetrics)}
      
      Provide JSON:
      {
        "feedback": "constructive feedback",
        "recommendations": ["recommendation 1", "recommendation 2"],
        "confidence_score": <0-1>
      }
    `;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch?.[0] || '{}');
    } catch {
      return {
        feedback: 'Generated feedback',
        recommendations: [],
        confidence_score: 0.5,
      };
    }
  }

  async generateMockQuestion(
    topic: string,
    difficulty: string,
    previousAnswers?: string[],
  ) {
    const prompt = `
      Generate a mock interview question for a ${difficulty} candidate.
      Topic: ${topic}
      ${previousAnswers?.length ? `Previous answers: ${previousAnswers.join(', ')}` : ''}
      
      Provide JSON:
      {
        "question": "the question",
        "hints": ["hint 1", "hint 2"],
        "ideal_answer_points": ["point 1", "point 2"]
      }
    `;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch?.[0] || '{}');
    } catch {
      return {
        question: 'Mock question',
        hints: [],
        ideal_answer_points: [],
      };
    }
  }
}