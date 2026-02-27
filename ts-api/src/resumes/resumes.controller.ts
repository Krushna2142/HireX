//C:\Projects\Job-Crawler\ts-api\src\resumes\resumes.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseGuard } from '../auth/firebase.guard';
import { ResumesService } from './resumes.service';

@Controller('resumes')
@UseGuards(FirebaseGuard)
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.resumes.parseResume(file);
  }
}
