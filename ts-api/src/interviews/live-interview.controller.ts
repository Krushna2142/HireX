/* eslint-disable prettier/prettier */
/**
 * POST /api/live-interview/assistant
 *
 * The room UI calls this (recruiter only). It forwards to the Python AI service and,
 * if Python is down / slow, returns a lightweight local result so the panel never
 * breaks mid-interview. Before this controller existed the route returned 404.
 */
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InterviewsService } from './interviews.service';

type AuthenticatedRequest = { user: { id: string; role?: string } };

type AssistantBody = {
  roomId?: string;
  transcript?: string;
  currentQuestion?: string;
  role?: string;
  skills?: string[];
};

type AssistantResult = {
  suggestedFollowUp: string;
  summary: string;
  suggestedScore: number;
  concerns: string[];
  positives: string[];
  source: 'ai-service' | 'fallback';
};

@Controller('live-interview')
@UseGuards(JwtAuthGuard)
export class LiveInterviewController {
  private readonly logger = new Logger(LiveInterviewController.name);

  constructor(
    private readonly interviews: InterviewsService,
    private readonly config: ConfigService,
  ) {}

  @Post('assistant')
  async assist(
    @Body() body: AssistantBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<AssistantResult> {
    const roomId = String(body?.roomId ?? '').trim();
    if (!roomId) throw new BadRequestException('roomId is required');

    const userRole = (req.user.role ?? '').toLowerCase();
    const access = await this.interviews.validateRoomAccess(roomId, req.user.id, userRole);
    // Only the interview's recruiter may use the interviewer copilot.
    if (!access.interviewId || access.hostUserId !== req.user.id || userRole !== 'recruiter') {
      throw new ForbiddenException('Only the interviewer can use the AI assistant');
    }

    const payload = {
      roomId,
      transcript: String(body.transcript ?? '').slice(-12_000),
      currentQuestion: body.currentQuestion?.slice(0, 1_000),
      role: body.role?.slice(0, 200),
      skills: Array.isArray(body.skills) ? body.skills.slice(0, 20).map(String) : [],
    };

    const base =
      this.config.get<string>('python.apiUrl')?.replace(/\/$/, '') ??
      process.env.PYTHON_API_URL?.replace(/\/$/, '');
    const apiKey = this.config.get<string>('python.apiKey') ?? process.env.PYTHON_API_KEY;

    if (base) {
      try {
        const res = await fetch(`${base}/live-interview/assistant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'x-api-key': apiKey } : {}),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(Number(process.env.LIVE_ASSISTANT_TIMEOUT_MS ?? 20_000)),
        });
        if (!res.ok) throw new Error(`python responded ${res.status}`);
        const data = (await res.json()) as Omit<AssistantResult, 'source'>;
        return { ...data, source: 'ai-service' };
      } catch (err) {
        this.logger.warn(
          `AI service unavailable, using fallback: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return this.fallback(payload);
  }

  private fallback(p: { transcript: string; currentQuestion?: string; skills: string[] }): AssistantResult {
    const text = p.transcript.trim();
    const lower = text.toLowerCase();
    const positives: string[] = [];
    const concerns: string[] = [];
    let score = 50;

    if (text.length > 150) {
      score += 15;
      positives.push('Candidate gave a reasonably detailed answer.');
    } else {
      concerns.push('Answer is short. Ask for more depth and examples.');
    }
    if (p.skills.some((s) => lower.includes(s.toLowerCase()))) {
      score += 15;
      positives.push('Answer references skills relevant to the role.');
    } else if (p.skills.length) {
      concerns.push('Answer does not clearly connect to the required skills.');
    }
    if (/not sure|don't know|confused/.test(lower)) {
      score -= 10;
      concerns.push('Candidate showed uncertainty. Try a simpler follow-up.');
    }

    const focus = p.skills[0] ?? 'the main concept';
    return {
      suggestedFollowUp: p.currentQuestion
        ? `Following "${p.currentQuestion}", what trade-offs did you consider and how would you improve it?`
        : `Can you walk me through how you would implement ${focus} in production?`,
      summary: 'AI service unavailable — showing a basic heuristic review.',
      suggestedScore: Math.max(0, Math.min(100, score)),
      concerns,
      positives,
      source: 'fallback',
    };
  }
}