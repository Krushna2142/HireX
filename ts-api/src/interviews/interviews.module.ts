/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [HttpModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}