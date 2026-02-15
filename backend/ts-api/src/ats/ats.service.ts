import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AtsService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async scoreResume(resumeText: string) {
    const pythonUrl = this.configService.get('pythonApiUrl');
    const apiKey = this.configService.get('pythonApiKey');

    const response = await firstValueFrom(
      this.httpService.post(
        `${pythonUrl}/ai/ats/score`,
        { resume_text: resumeText },
        { headers: { 'X-API-KEY': apiKey } },
      ),
    );

    return response.data;
  }
}
