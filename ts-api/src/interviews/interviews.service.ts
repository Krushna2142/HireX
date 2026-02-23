/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InterviewsService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async scoreInterview(data: any) {
    const pythonUrl = this.configService.get('pythonApiUrl');
    const apiKey = this.configService.get('pythonApiKey');

    const response = await firstValueFrom(
      this.httpService.post(`${pythonUrl}/ai/interview/score`, data, {
        headers: { 'X-API-KEY': apiKey },
      }),
    );

    return response.data;
  }
}
