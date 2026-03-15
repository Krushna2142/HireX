import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('resumes')
export class ResumesController {
  private readonly logger = new Logger(ResumesController.name);

  constructor(private readonly service: ResumesService) {}

  @Post('upload-raw')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.logger.log(`POST /resumes/upload-raw — user: ${req.user?.id}`);

    // ── Guard: authentication
    if (!req.user?.id) {
      throw new BadRequestException('User not authenticated');
    }

    // ── Guard: file presence
    if (!file) {
      throw new BadRequestException('No file received. Ensure field name is "file" and Content-Type is multipart/form-data');
    }

    this.logger.log(`Received file: ${file.originalname} | ${file.mimetype} | ${file.size} bytes`);

    // ── Guard: MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: "${file.mimetype}". Accepted: PDF, DOCX, DOC`,
      );
    }

    // ── Guard: file size (belt-and-suspenders beyond multer limit)
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 5MB limit');
    }

    // ── Guard: empty file
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }

    return this.service.saveRawResume(file, req.user.id);
  }

  @Get()
  async getResumes(@Req() req: any) {
    this.logger.log(`GET /resumes — user: ${req.user?.id}`);
    // Stub — extend ResumesService to support listing by userId
    return { resumes: [], message: 'Resume listing coming soon' };
  }
}