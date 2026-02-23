/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseGuard } from './firebase.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('credentials/create')
  @UseGuards(FirebaseGuard)
  async create(@Body() body: any) {
    return this.auth.createCredentials(body);
  }

  @Post('credentials/verify')
  @UseGuards(FirebaseGuard)
  async verify(@Body() body: any) {
    return this.auth.verifyCredentials(body);
  }
}