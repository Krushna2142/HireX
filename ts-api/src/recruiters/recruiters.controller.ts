/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// ts-api/src/recruiters/recruiters.controller.ts

import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruitersService } from './recruiters.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Controller('recruiters')
@UseGuards(JwtAuthGuard)
export class RecruitersController {
  constructor(private readonly recruiters: RecruitersService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.recruiters.getEnrichedProfile(req.user.id);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateRecruiterProfileDto) {
    return this.recruiters.updateProfile(req.user.id, dto);
  }
}