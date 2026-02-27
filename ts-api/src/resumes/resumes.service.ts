/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ResumesService {
  constructor(
    private supabase: SupabaseService,
    private http: HttpService,
    private config: ConfigService,
  ) {}

  async uploadResume(file: Express.Multer.File, userId: string) {
    const fileName = `${Date.now()}-${file.originalname}`;

    // 1️⃣ Upload to Supabase Storage
    await this.supabase.client.storage
      .from('resumes')
      .upload(fileName, file.buffer);

    // 2️⃣ Insert metadata
    const { data, error } = await this.supabase.client
      .from('resumes')
      .insert({
        user_id: userId,
        file_name: fileName,
        status: 'processing',
      })
      .select()
      .single();

    if (error) throw error;

    // 3️⃣ Call FastAPI (AI processing)
    await this.processResumeAI(file.buffer, data.id);

    return { message: 'Resume uploaded', id: data.id };
  }

  private async processResumeAI(buffer: Buffer, resumeId: string) {
    const formData = new FormData();
    formData.append('file', buffer, 'resume.pdf');

    const pythonUrl = this.config.get<string>('PYTHON_API_URL');
    const apiKey = this.config.get<string>('PYTHON_API_KEY');

    const response = await firstValueFrom(
      this.http.post(`${pythonUrl}/ai/analyze`, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-KEY': apiKey,
        },
      }),
    );

    const analysis = response.data;

    await this.supabase.client
      .from('resumes')
      .update({
        analysis,
        status: 'completed',
      })
      .eq('id', resumeId);
  }
}