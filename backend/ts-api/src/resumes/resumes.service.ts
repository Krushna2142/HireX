import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ResumesService {
  private supabase;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get('supabase.url') || '',
      this.configService.get('supabase.anonKey') || '',
    );
  }

  async uploadResume(file: Express.Multer.File) {
    // Upload to Supabase storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const { error } = await this.supabase.storage
      .from('resumes')
      .upload(fileName, file.buffer);

    if (error) throw new Error(error.message);

    // Call Python AI to parse
    const pythonUrl = this.configService.get('pythonApiUrl');
    const apiKey = this.configService.get('pythonApiKey');

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);

    const response = await firstValueFrom(
      this.httpService.post(`${pythonUrl}/ai/resume/parse`, formData, {
        headers: { 'X-API-KEY': apiKey },
      }),
    );

    return { message: 'Resume uploaded', data: response.data };
  }

  async getMyResumes() {
    const { data, error } = await this.supabase
      .from('resumes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { resumes: data };
  }
}
