import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResumesService } from './resumes.service';
import { FirebaseGuard } from '../auth/firebase.guard';

@Controller('resumes')
@UseGuards(FirebaseGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    return this.resumesService.uploadResume(file);
  }

  @Get('me')
  async getMyResumes() {
    return this.resumesService.getMyResumes();
  }
}
