import { Module } from '@nestjs/common';
import { AtsService } from './ats.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}
