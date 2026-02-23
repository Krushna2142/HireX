/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
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