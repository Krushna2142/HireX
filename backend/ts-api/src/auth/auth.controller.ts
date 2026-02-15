import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseGuard } from './firebase.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('credentials/create')
  @UseGuards(FirebaseGuard)
  async createCredentials(@Body() body: any) {
    return this.authService.createCredentials(body);
  }

  @Post('credentials/verify')
  @UseGuards(FirebaseGuard)
  async verifyCredentials(@Body() body: any) {
    return this.authService.verifyCredentials(body);
  }
}
