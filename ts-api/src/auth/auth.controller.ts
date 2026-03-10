/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      role?: string;
    },
  ) {
    return this.auth.register(
      body.fullName,
      body.email,
      body.password,
      body.role || 'candidate',
    );
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
  ) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(@Req() req: any) {
    return this.auth.getMe(req.user.sub);
  }
}