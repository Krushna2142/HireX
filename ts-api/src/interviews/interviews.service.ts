/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/interviews/interviews.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService }   from '../../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';
import { LlmService }      from '../ollama/Llm.service';   // ← was OllamaService

// ── Domain interfaces ─────────────────────────────────────────────────────────

interface GeneratedQuestion {
  question:    string;
  category:    string;
  difficulty:  string;
  idealAnswer: string;
}

interface QuestionSet {
  questions:   GeneratedQuestion[];
  jobTitle:    string;
  sessionType: string;
}

interface AnswerEvaluation {
  score:        number;
  feedback:     string;
  strengths:    string[];
  improvements: string[];
}

// ── System prompts ────────────────────────────────────────────────────────────

const QUESTION_SYSTEM_PROMPT = `
You are a senior technical interviewer at a top tech company.
Generate interview questions based on the job role and candidate's background.

Return ONLY valid JSON — no preamble, no markdown fences.

Schema:
{
  "questions": [
    {
      "question": string,
      "category": "technical|behavioral|system_design|coding",
      "difficulty": "easy|medium|hard",
      "idealAnswer": string
    }
  ]
}

Rules:
- Generate exactly 5 questions
- Mix categories: 2 technical, 1 behavioral, 1 system design, 1 coding concept
- Scale difficulty to experience level
- Make questions specific to the role, not generic
`.trim();

const EVALUATION_SYSTEM_PROMPT = `
You are an expert technical interviewer evaluating a candidate's answer.
Score the answer and provide actionable feedback.

Return ONLY valid JSON — no preamble, no markdown fences.

Schema:
{
  "score": number,
  "feedback": string,
  "strengths": string[],
  "improvements": string[]
}

Scoring rubric:
- 90-100: Exceptional, covers all key points with depth
- 70-89:  Good, covers most key points
- 50-69:  Adequate, covers basics but misses important aspects
- 30-49:  Below expectations, significant gaps
- 0-29:   Unsatisfactory, fundamental misunderstanding
`.trim();

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    private readonly db:    DatabaseService,
    private readonly prisma: PrismaService,
    private readonly llm:   LlmService,   // ← was OllamaService
  ) {}

  // ── Start interview session ───────────────────────────────────────────────

  async startSession(
    candidateId: string,
    jobTitle:    string,
    company:     string,
    sessionType: string,
    jobId?:      string,
  ) {
    this.logger.log(`Starting ${sessionType} session for: ${jobTitle} at ${company}`);

    // Fetch candidate context for tailored question generation
    const { rows: analysisRows } = await this.db.query(
      `SELECT ra.skills, ra.work_experience, ra.experience_level, ra.experience_years
       FROM resume_analyses ra
       JOIN resumes r ON r.id = ra.resume_id
       JOIN candidate_profiles cp ON cp.active_resume_id = r.id
       WHERE cp.user_id = $1
         AND ra.status = 'completed'
       ORDER BY ra.created_at DESC
       LIMIT 1`,
      [candidateId],
    );

    const candidateContext = analysisRows[0]
      ? `Experience Level: ${analysisRows[0].experience_level}\n` +
        `Years: ${analysisRows[0].experience_years}\n` +
        `Skills: ${JSON.stringify(analysisRows[0].skills).slice(0, 500)}`
      : 'No resume on file — generate general questions for the role';

    // Generate questions via Groq
    const questionSet = await this.llm.extractJsonWithRetry<QuestionSet>(
      QUESTION_SYSTEM_PROMPT,
      `Role: ${jobTitle}
       Company: ${company || 'a tech company'}
       Interview Type: ${sessionType}
       Candidate Background: ${candidateContext}

       Generate 5 targeted interview questions.`,
    );

    // Persist session
    const { rows: sessionRows } = await this.db.query(
      `INSERT INTO interview_sessions
         (candidate_id, job_id, job_title, company, session_type, total_questions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [candidateId, jobId, jobTitle, company, sessionType, questionSet.questions.length],
    );

    const session = sessionRows[0];

    // Persist questions in parallel
    const questionResults = await Promise.all(
      questionSet.questions.map((q, i) =>
        this.db.query(
          `INSERT INTO interview_questions
             (session_id, question_number, question, category, difficulty, ideal_answer)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [session.id, i + 1, q.question, q.category, q.difficulty, q.idealAnswer],
        ),
      ),
    );

    const questions = questionResults.map(r => r.rows[0]);

    this.logger.log(`Session ${session.id} created with ${questions.length} questions`);

    return {
      session,
      // idealAnswer deliberately excluded — revealed only after candidate answers
      questions: questions.map(q => ({
        id:             q.id,
        questionNumber: q.question_number,
        question:       q.question,
        category:       q.category,
        difficulty:     q.difficulty,
      })),
    };
  }

  // ── Submit answer for evaluation ──────────────────────────────────────────

  async submitAnswer(
    questionId:     string,
    candidateId:    string,
    answer:         string,
    timeTakenSecs:  number,
  ) {
    const { rows } = await this.db.query(
      `SELECT q.*, s.candidate_id
       FROM interview_questions q
       JOIN interview_sessions s ON s.id = q.session_id
       WHERE q.id = $1`,
      [questionId],
    );

    if (!rows.length || rows[0].candidate_id !== candidateId) {
      throw new NotFoundException('Question not found');
    }

    const question = rows[0];

    // Evaluate via Groq
    const evaluation = await this.llm.extractJsonWithRetry<AnswerEvaluation>(
      EVALUATION_SYSTEM_PROMPT,
      `Question: ${question.question}
       Ideal Answer Benchmark: ${question.ideal_answer}
       Candidate's Answer: ${answer}

       Evaluate the candidate's answer objectively.`,
    );

    const { rows: updated } = await this.db.query(
      `UPDATE interview_questions
       SET user_answer     = $1,
           score           = $2,
           feedback        = $3,
           time_taken_secs = $4,
           answered_at     = NOW()
       WHERE id = $5
       RETURNING *`,
      [answer, evaluation.score, evaluation.feedback, timeTakenSecs, questionId],
    );

    return {
      ...updated[0],
      evaluation,
      idealAnswer: question.ideal_answer,   // safe to reveal post-answer
    };
  }

  // ── Complete session ──────────────────────────────────────────────────────

  async completeSession(sessionId: string, candidateId: string) {
    const { rows: questions } = await this.db.query(
      `SELECT q.*
       FROM interview_questions q
       JOIN interview_sessions s ON s.id = q.session_id
       WHERE q.session_id = $1 AND s.candidate_id = $2`,
      [sessionId, candidateId],
    );

    if (!questions.length) throw new NotFoundException('Session not found');

    const answeredCount = questions.filter(q => q.user_answer).length;
    const totalScore    = questions
      .filter(q => q.score !== null)
      .reduce((sum, q) => sum + q.score, 0);
    const avgScore      = answeredCount > 0
      ? Math.round(totalScore / answeredCount)
      : 0;

    const { rows: session } = await this.db.query(
      `UPDATE interview_sessions
       SET status        = 'completed',
           overall_score = $1,
           completed_at  = NOW()
       WHERE id = $2
       RETURNING *`,
      [avgScore, sessionId],
    );

    return {
      session:   session[0],
      questions,
      summary: {
        totalQuestions: questions.length,
        answered:       answeredCount,
        averageScore:   avgScore,
        scoreBreakdown: {
          excellent: questions.filter(q => q.score >= 90).length,
          good:      questions.filter(q => q.score >= 70 && q.score < 90).length,
          adequate:  questions.filter(q => q.score >= 50 && q.score < 70).length,
          needsWork: questions.filter(q => q.score !== null && q.score < 50).length,
        },
        byCategory: this.aggregateByCategory(questions),
      },
    };
  }

  // ── Session history ───────────────────────────────────────────────────────

  async getSessionHistory(candidateId: string) {
    const { rows } = await this.db.query(
      `SELECT s.*,
         COUNT(q.id)                                              AS total_questions,
         COUNT(q.id) FILTER (WHERE q.answered_at IS NOT NULL)    AS answered
       FROM interview_sessions s
       LEFT JOIN interview_questions q ON q.session_id = s.id
       WHERE s.candidate_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 20`,
      [candidateId],
    );
    return rows;
  }

  // ── Session detail ────────────────────────────────────────────────────────

  async getSession(sessionId: string, candidateId: string) {
    const { rows: sessions } = await this.db.query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
      [sessionId, candidateId],
    );

    if (!sessions.length) throw new NotFoundException('Session not found');

    const { rows: questions } = await this.db.query(
      'SELECT * FROM interview_questions WHERE session_id = $1 ORDER BY question_number',
      [sessionId],
    );

    return { session: sessions[0], questions };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private aggregateByCategory(questions: any[]) {
    const categories: Record<string, { count: number; totalScore: number }> = {};

    questions.forEach(q => {
      if (!q.category) return;
      if (!categories[q.category]) {
        categories[q.category] = { count: 0, totalScore: 0 };
      }
      categories[q.category].count++;
      if (q.score !== null) {
        categories[q.category].totalScore += q.score;
      }
    });

    return Object.entries(categories).map(([category, data]) => ({
      category,
      averageScore: data.count > 0
        ? Math.round(data.totalScore / data.count)
        : 0,
    }));
  }
}