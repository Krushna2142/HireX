/* eslint-disable prettier/prettier */
// C:\Projects\Job-Crawler\ts-api\src\auth\auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './supabase.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('credentials/create')
  @UseGuards(SupabaseGuard)
  async create(@Body() body: any) {
    return this.auth.createCredentials(body);
  }

  @Post('credentials/verify')
  @UseGuards(SupabaseGuard)
  async verify(@Body() body: any) {
    return this.auth.verifyCredentials(body);
  }
}