//  C:\Projects\Job-Crawler\ts-api\src\auth\auth.module.ts
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './supabase.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseGuard],
  exports: [SupabaseGuard],
})
export class AuthModule {}