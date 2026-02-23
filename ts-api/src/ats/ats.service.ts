/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AtsService {
  constructor(private http: HttpService, private config: ConfigService) {}

  async score(resumeText: string) {
    const pythonUrl = this.config.get('pythonApiUrl');
    const apiKey = this.config.get('pythonApiKey');

    const response = await firstValueFrom(
      this.http.post(
        `${pythonUrl}/ai/ats/score`,
        { resume_text: resumeText },
        { headers: { 'X-API-KEY': apiKey } },
      ),
    );

    return response.data;
  }
}