/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterError } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumesService } from './resumes.service';
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Catch(MulterError)
class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    if (exception.code === 'LIMIT_FILE_SIZE') {
      throw new PayloadTooLargeException('File exceeds 5 MB limit');
    }

    if (exception.code === 'LIMIT_UNEXPECTED_FILE') {
      throw new BadRequestException('Unexpected file field. Use field name "file"');
    }

    throw new BadRequestException(`Upload failed: ${exception.message}`);
  }
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
@UseFilters(MulterExceptionFilter)
export class ResumesController {
  private readonly logger = new Logger(ResumesController.name);

  constructor(private readonly service: ResumesService) {}

  @Post('upload-raw')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              `Unsupported file type: ${file.mimetype}. Accepted: PDF, DOCX, DOC`,
            ) as any,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadRaw(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.logger.log(`POST /resumes/upload-raw — user: ${req.user?.id}`);

    if (!req.user?.id) {
      throw new BadRequestException('User not authenticated');
    }

    if (!file) {
      throw new BadRequestException(
        'No file received. Field name must be "file" with Content-Type: multipart/form-data',
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('File is empty');
    }

    return this.service.saveRawResume(file, req.user.id);
  }

  @Post(':id/analyse')
  async triggerAnalysis(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`POST /resumes/${id}/analyse — user: ${req.user?.id}`);
    return this.service.triggerAnalysis(id, req.user.id);
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user.id);
  }

  @Get('latest')
  async getLatest(@Req() req: any) {
    return this.service.getLatest(req.user.id);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user.id);
  }

  @Get(':id/analysis')
  async getAnalysis(@Param('id') id: string, @Req() req: any) {
    return this.service.getAnalysis(id, req.user.id);
  }
}