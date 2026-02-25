import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AtsService } from './ats.service';

@Module({
  imports: [HttpModule],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}