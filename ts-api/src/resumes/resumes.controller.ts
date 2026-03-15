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

    if (!file.mimetype.includes('pdf') && !file.mimetype.includes('word')) {
      throw new BadRequestException(
        'Only PDF and Word documents are accepted',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    return this.service.saveRawResume(file, req.user.id);
  }
}