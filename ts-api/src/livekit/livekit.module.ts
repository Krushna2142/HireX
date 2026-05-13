import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InterviewsModule } from '../interviews/interviews.module';
import { LivekitController } from './livekit.controller';
import { LivekitService } from './livekit.service';

@Module({
  imports: [
    ConfigModule,
    InterviewsModule,
  ],
  controllers: [
    LivekitController,
  ],
  providers: [
    LivekitService,
  ],
  exports: [
    LivekitService,
  ],
})
export class LivekitModule {}