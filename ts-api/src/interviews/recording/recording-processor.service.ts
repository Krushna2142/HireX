// Recording Processor - Handles upload & transcription
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AIService } from '../../ai/ai.service';

@Injectable()
export class RecordingProcessorService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private aiService: AIService,
    @InjectQueue('transcription') private transcriptionQueue: Queue,
  ) {}

  /**
   * Upload recording to Supabase Storage
   */
  async uploadRecording(
    sessionId: string,
    roundId: string,
    fileBuffer: Buffer,
    fileName: string,
  ) {
    try {
      // Upload to Supabase Storage
      const storagePath = `interviews/${sessionId}/${fileName}`;
      const { data, error } = await this.supabase.storage
        .from('interview-recordings')
        .upload(storagePath, fileBuffer);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Create database record
      const recording = await this.prisma.interview_recordings.create({
        data: {
          session_id: sessionId,
          recruiter_round_id: roundId,
          storage_path: storagePath,
          file_size_bytes: fileBuffer.length,
          status: 'processing',
          transcription_status: 'pending',
        },
      });

      // Queue transcription job
      await this.transcriptionQueue.add(
        'transcribe',
        {
          recordingId: recording.id,
          sessionId,
          storagePath,
        },
        { delay: 1000 }, // Start after 1 second
      );

      return recording;
    } catch (error) {
      throw new Error(`Recording upload failed: ${error.message}`);
    }
  }

  /**
   * Get recording by session
   */
  async getRecordingBySession(sessionId: string) {
    return this.prisma.interview_recordings.findFirst({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Process transcription (called by BullMQ job)
   */
  async processTranscription(recordingId: string, storagePath: string) {
    try {
      // Download from Supabase
      const { data, error } = await this.supabase.storage
        .from('interview-recordings')
        .download(storagePath);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      // Transcribe using Gemini
      const buffer = await data.arrayBuffer();
      const transcript = await this.aiService.transcribeAudio(
        Buffer.from(buffer),
      );

      // Store transcript
      await this.prisma.interview_recordings.update({
        where: { id: recordingId },
        data: {
          transcription_status: 'completed',
          status: 'completed',
        },
      });

      // Store transcript in database
      await this.prisma.interview_transcripts.create({
        data: {
          content: transcript,
          is_final: true,
        },
      });

      return { success: true, transcript };
    } catch (error) {
      await this.prisma.interview_recordings.update({
        where: { id: recordingId },
        data: { transcription_status: 'failed' },
      });

      throw error;
    }
  }
}