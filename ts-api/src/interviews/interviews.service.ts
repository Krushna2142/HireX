/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InterviewsService {
  constructor(private http: HttpService, private config: ConfigService) {}

  async generateResponse(messages: { role: string; content: string }[]) {
    const pythonUrl = this.config.get('pythonApiUrl');
    const apiKey = this.config.get('pythonApiKey');

    const response = await firstValueFrom(
      this.http.post(
        `${pythonUrl}/ai/interview/mock`,
        { messages },
        { headers: { 'X-API-KEY': apiKey } },
      ),
    );

    return response.data;
  }
}