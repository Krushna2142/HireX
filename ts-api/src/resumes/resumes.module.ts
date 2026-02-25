import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [HttpModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}