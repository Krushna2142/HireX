/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/alerts/alerts.controller.ts
import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  getAlerts(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alerts.getUserAlerts(
      req.user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.alerts.markRead(req.user.id, [id]);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.alerts.markRead(req.user.id);
  }
}
