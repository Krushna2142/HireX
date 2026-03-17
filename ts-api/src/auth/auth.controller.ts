/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { AuthService, UserRow }             from './auth.service';  // ← import UserRow
import { Public }           from './decorators/public.decorators';
import { RegisterDto }      from './dto/register.dto';
import { LoginDto }         from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto }  from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.auth.resetPassword(body);
  }

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  // Explicit return type so TS4053 cannot fire — UserRow is now exported

  @Get('me')
  async me(@Req() req: any): Promise<UserRow> {   // ← explicit return type
    return this.auth.getMe(req.user.id);
  }
}