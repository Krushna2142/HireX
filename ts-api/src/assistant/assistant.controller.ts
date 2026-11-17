// ts-api/src/assistant/assistant.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength } from 'class-validator';
import { Public } from '../auth/decorators/public.decorators';
import { AssistantService, AssistantReply } from './assistant.service';

export class AssistantChatDto {
  @IsString()
  @MaxLength(500)
  message: string | undefined;
}

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  /** Public product assistant — no auth, no user data, hard rate-limited. */
  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 15, ttl: 60_000 } })
  chat(@Body() dto: AssistantChatDto): Promise<AssistantReply> {
    return this.assistant.answer(dto?.message);
  }
}