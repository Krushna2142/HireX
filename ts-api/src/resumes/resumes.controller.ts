import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';

// Explicit allowlist — no substring matching ambiguity
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('resumes')
export class ResumesController {
  constructor(private readonly service: ResumesService) {}

  @Post('upload-raw')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Only PDF and Word documents are accepted.`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    return this.service.saveRawResume(file, req.user.id);
  }
}