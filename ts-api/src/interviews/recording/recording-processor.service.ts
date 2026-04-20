// ts-api/src/interviews/recording/recording-processor.service.ts (COMPLETE)

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Processor, Process } from '@nestjs/bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DatabaseService } from '../../database/database.service';
import { AIService } from '../../ai/ai.service';

@Injectable()
export class RecordingProcessorService {
  private readonly logger = new Logger(RecordingProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private supabase: DatabaseService,
    private aiService: AIService,
    @InjectQueue('transcription') private transcriptionQueue: Queue,
  ) {}

  /**
   * Upload recording blob to Supabase Storage
   * Called from frontend or gateway
   */
  async uploadRecording(
    sessionId: string,
    roundId: string,
    fileBuffer: Buffer,
    fileName: string,
  ) {
    try {
      const storagePath = `interview-recordings/${sessionId}/${Date.now()}-${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('interview-recordings')
        .upload(storagePath, fileBuffer, {
          contentType: 'audio/webm;codecs=opus',
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      // Create database record
      const recording = await this.prisma.interview_recordings.create({
        data: {
          session_id: sessionId,
          recruiter_round_id: roundId,
          storage_path: storagePath,
          file_size_bytes: fileBuffer.length,
          status: 'processing',
          transcription_status: 'queued',
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
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        },
      );

      this.logger.log(
        `Recording uploaded: ${recording.id} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`,
      );

      return {
        recordingId: recording.id,
        status: 'queued',
        storagePath,
      };
    } catch (err) {
      this.logger.error(`Recording upload failed: ${String(err)}`);
      throw err;
    }
  }

  /**
   * Download recording from Supabase and transcribe
   * Called by BullMQ worker
   */
  async processTranscription(recordingId: string, storagePath: string) {
    try {
      this.logger.log(`Transcribing: ${recordingId}`);

      // Update status
      await this.prisma.interview_recordings.update({
        where: { id: recordingId },
        data: { transcription_status: 'processing' },
      });

      // Download from Supabase
      const { data, error: downloadError } = await this.supabase.storage
        .from('interview-recordings')
        .download(storagePath);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      // Convert to Buffer
      const buffer = Buffer.from(await data.arrayBuffer());

      // Transcribe using Gemini (or external service)
      const transcript = await this.aiService.transcribeAudio(buffer, 'en');

      // Store transcript in database
      const recording = await this.prisma.interview_recordings.findUnique({
        where: { id: recordingId },
      });

      if (recording) {
        await this.prisma.interview_transcripts.create({
          data: {
            session_id: recording.session_id,
            content: transcript,
            is_final: true,
            source: 'recording_transcription',
          },
        });
      }

      // Update recording status
      await this.prisma.interview_recordings.update({
        where: { id: recordingId },
        data: {
          transcription_status: 'completed',
          status: 'completed',
        },
      });

      this.logger.log(`Transcription completed: ${recordingId}`);
      return { success: true, transcript };
    } catch (err) {
      this.logger.error(`Transcription failed: ${String(err)}`);

      await this.prisma.interview_recordings.update({
        where: { id: recordingId },
        data: { transcription_status: 'failed' },
      });

      throw err;
    }
  }

  /**
   * Get recording for download (generate signed URL)
   */
  async getRecordingUrl(recordingId: string, expirySeconds = 3600) {
    const recording = await this.prisma.interview_recordings.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await this.supabase.storage
      .from('interview-recordings')
      .createSignedUrl(recording.storage_path, expirySeconds);

    if (error) {
      throw new Error(`Failed to generate URL: ${error.message}`);
    }

    return {
      recordingId,
      url: data.signedUrl,
      expiresIn: expirySeconds,
    };
  }

  /**
   * Delete recording (cleanup)
   */
  async deleteRecording(recordingId: string) {
    const recording = await this.prisma.interview_recordings.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    // Delete from Supabase
    await this.supabase.storage
      .from('interview-recordings')
      .remove([recording.storage_path]);

    // Delete from database
    await this.prisma.interview_recordings.delete({
      where: { id: recordingId },
    });

    this.logger.log(`Recording deleted: ${recordingId}`);
  }
}

/**
 * BullMQ processor for transcription jobs
 */
@Processor('transcription')
export class TranscriptionProcessor {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(private recordingService: RecordingProcessorService) {}

  @Process('transcribe')
  async handleTranscription(job: any) {
    this.logger.log(`Processing transcription job: ${job.id}`);
    const { recordingId, storagePath } = job.data;
    return this.recordingService.processTranscription(recordingId, storagePath);
  }
}