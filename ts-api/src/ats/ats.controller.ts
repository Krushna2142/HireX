/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// ts-api/src/ats/ats.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AtsService } from './ats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

function getUserId(req: any): string {
  return req.user?.id;
}

@Controller('ats')
@UseGuards(JwtAuthGuard)
export class AtsController {
  constructor(private readonly atsService: AtsService) {}

  @Get('jobs/:jobId/applications')
  getJobApplications(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() req: any,
  ) {
    return this.atsService.getJobApplications(jobId, getUserId(req));
  }

  @Post('applications/:applicationId/run')
  runSingle(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Req() req: any,
  ) {
    return this.atsService.enqueueSingleApplication(
      applicationId,
      getUserId(req),
    );
  }

  @Post('jobs/:jobId/run-bulk')
  runBulk(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() body: { vacancyCount?: number },
    @Req() req: any,
  ) {
    return this.atsService.enqueueBulkForJob(
      jobId,
      getUserId(req),
      Number(body?.vacancyCount ?? 1),
    );
  }

  @Get('batches/:batchId')
  getBatch(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Req() req: any,
  ) {
    return this.atsService.getBatchStatus(batchId, getUserId(req));
  }

  @Post('jobs/:jobId/auto-shortlist')
  autoShortlist(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() body: { vacancyCount?: number },
    @Req() req: any,
  ) {
    return this.atsService.autoShortlist(
      jobId,
      getUserId(req),
      Number(body?.vacancyCount ?? 1),
    );
  }
}