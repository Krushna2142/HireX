/* eslint-disable prettier/prettier */
// src/alerts/alerts.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('alerts')
export class AlertsController {
  @Get()
  getAlerts() {
    return { alerts: [], unread: 0 };
  }
}