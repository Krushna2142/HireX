/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { ResumesService } from './resumes.service';

@Controller('resumes')
export class ResumesController {
  constructor(private readonly service: ResumesService) {}

  @Post()
  async upload(@Body() body: { content: string; userId: string }) {
    return this.service.create(body.content, body.userId);
  }
}