// ts-api/src/interviews/recording/recording-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { getSupabaseServiceClient } from '../../lib/supabase';

const RECORDING_BUCKET = 'interview-recordings';

@Injectable()
export class RecordingProcessorService {
  private readonly logger = new Logger(RecordingProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    @InjectQueue('transcription') private transcriptionQueue: Queue,
  ) {}

  /** Upload recording blob to Supabase Storage */
  async uploadRecording(
    interviewId: string,
    roomId: string | null,
    fileBuffer: Buffer,
    fileName: string,
  ) {
    const storagePath = `${interviewId}/${Date.now()}-${fileName}`;
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase.storage
      .from(RECORDING_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'audio/webm;codecs=opus',
        upsert: false,
      });

    if (error) {
      this.logger.error(`Recording upload failed: ${error.message}`);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const recording = await this.prisma.interviewRecording.create({
      data: {
        interviewId,
        roomId,
        storagePath,
        fileSizeBytes: BigInt(fileBuffer.length),
        status: 'processing',
        transcriptionStatus: 'queued',
      },
    });

    await this.transcriptionQueue.add(
      'transcribe',
      { recordingId: recording.id, interviewId, storagePath },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    this.logger.log(
      `Recording uploaded: ${recording.id} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`,
    );

    return { recordingId: recording.id, status: 'queued', storagePath };
  }

  /** Download recording from Supabase and transcribe */
  async processTranscription(recordingId: string, storagePath: string) {
    try {
      this.logger.log(`Transcribing: ${recordingId}`);

      await this.prisma.interviewRecording.update({
        where: { id: recordingId },
        data: { transcriptionStatus: 'processing' },
      });

      const supabase = getSupabaseServiceClient();
      const { data, error: downloadError } = await supabase.storage
        .from(RECORDING_BUCKET)
        .download(storagePath);

      if (downloadError || !data) {
        throw new Error(`Download failed: ${downloadError?.message ?? 'no data'}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const transcript = await this.aiService.transcribeAudio(buffer, 'en');

      const recording = await this.prisma.interviewRecording.findUnique({
        where: { id: recordingId },
      });

      if (recording) {
        await this.prisma.interviewTranscript.create({
          data: {
            interviewId: recording.interviewId,
            roomId: recording.roomId,
            content: transcript,
            isFinal: true,
            source: 'recording_transcription',
          },
        });
      }

      await this.prisma.interviewRecording.update({
        where: { id: recordingId },
        data: { transcriptionStatus: 'completed', status: 'completed' },
      });

      this.logger.log(`Transcription completed: ${recordingId}`);
      return { success: true, transcript };
    } catch (err) {
      this.logger.error(`Transcription failed: ${String(err)}`);
      await this.prisma.interviewRecording.update({
        where: { id: recordingId },
        data: { transcriptionStatus: 'failed' },
      });
      throw err;
    }
  }

  /** Signed download URL */
  async getRecordingUrl(recordingId: string, expirySeconds = 3600) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { id: recordingId },
    });
    if (!recording) throw new Error('Recording not found');

    const { data, error } = await getSupabaseServiceClient()
      .storage.from(RECORDING_BUCKET)
      .createSignedUrl(recording.storagePath, expirySeconds);

    if (error) throw new Error(`Failed to generate URL: ${error.message}`);

    return { recordingId, url: data.signedUrl, expiresIn: expirySeconds };
  }

  /** Delete recording + storage object */
  async deleteRecording(recordingId: string) {
    const recording = await this.prisma.interviewRecording.findUnique({
      where: { id: recordingId },
    });
    if (!recording) throw new Error('Recording not found');

    await getSupabaseServiceClient()
      .storage.from(RECORDING_BUCKET)
      .remove([recording.storagePath]);

    await this.prisma.interviewRecording.delete({ where: { id: recordingId } });

    this.logger.log(`Recording deleted: ${recordingId}`);
  }
}

/** BullMQ worker for transcription jobs */
@Processor('transcription')
export class TranscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptionProcessor.name);

  constructor(private recordingService: RecordingProcessorService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing transcription job: ${job.id}`);
    const { recordingId, storagePath } = job.data as {
      recordingId: string;
      storagePath: string;
    };
    return this.recordingService.processTranscription(recordingId, storagePath);
  }
}