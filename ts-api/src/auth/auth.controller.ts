/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorators';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()  // ✅ Bypasses global JwtAuthGuard — no token required
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Public()  // ✅ Bypasses global JwtAuthGuard — no token required
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Public()  // ✅ Unauthenticated users need to reset their password
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body);
  }

  @Public()  // ✅ Reset link recipients aren't authenticated
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body);
  }

  // ✅ No @UseGuards needed — global APP_GUARD handles this automatically
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.getMe(req.user.id);
  }
}