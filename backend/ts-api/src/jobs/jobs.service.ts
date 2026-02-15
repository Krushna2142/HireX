import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JobsService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async fetchJobs(query: any) {
    const serpApiKey = this.configService.get('serpApiKey');
    const response = await firstValueFrom(
      this.httpService.get('https://serpapi.com/search', {
        params: {
          api_key: serpApiKey,
          engine: 'google_jobs',
          q: query.query,
        },
      }),
    );

    return response.data;
  }
}
