import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ResumesService {
  constructor(private http: HttpService, private config: ConfigService) {}

  async parseResume(file: Express.Multer.File) {
    const form = new FormData();
    form.append('file', file.buffer, file.originalname);

    const pythonUrl = this.config.get('pythonApiUrl');
    const apiKey = this.config.get('pythonApiKey');

    const response = await firstValueFrom(
      this.http.post(`${pythonUrl}/ai/resume/parse`, form, {
        headers: {
          ...form.getHeaders(),
          'X-API-KEY': apiKey,
        },
      }),
    );

    return response.data;
  }
}