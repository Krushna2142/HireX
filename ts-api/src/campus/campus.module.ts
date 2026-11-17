// ts-api/src/campus/campus.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AtsModule } from '../ats/ats.module';
import { InterviewsModule } from '../interviews/interviews.module';
import { CAMPUS_QUEUE } from './campus.constants';
import { CampusController } from './campus.controller';
import { CampusTenantService } from './campus-tenant.service';
import { CampusAcademicsService } from './campus-academics.service';
import { CampusDriveService } from './campus-drive.service';
import { CampusApplicationService } from './campus-application.service';
import { CampusOfferService } from './campus-offer.service';
import { CampusAnalyticsService } from './campus-analytics.service';
import { CampusBulkService } from './campus-bulk.service';
import { CampusProcessor } from './campus.processor';

@Module({
  imports: [
    PrismaModule,
    AlertsModule,
    AtsModule,
    InterviewsModule,
    BullModule.registerQueue({ name: CAMPUS_QUEUE }),
  ],
  controllers: [CampusController],
  providers: [
    CampusTenantService,
    CampusAcademicsService,
    CampusDriveService,
    CampusApplicationService,
    CampusOfferService,
    CampusAnalyticsService,
    CampusBulkService,
    CampusProcessor,
  ],
  exports: [CampusTenantService, CampusDriveService],
})
export class CampusModule {}