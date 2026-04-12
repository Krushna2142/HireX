/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Req, Res, Query, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, UserRow } from './auth.service';
import { Public } from './decorators/public.decorators';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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

  @Get('me')
  async me(@Req() req: any): Promise<UserRow> {
    return this.auth.getMe(req.user.id);
  }

  // ---------- OAuth Google ----------
  @Public()
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  async googleStart(@Req() _req: any, @Query('role') _role?: 'candidate' | 'recruiter') {
    return;
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const { token } = await this.auth.loginOrRegisterOAuth({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'google',
      providerId: req.user.providerId,
      requestedRole: req.user.requestedRole,
    });

    return res.redirect(this.auth.buildFrontendOAuthRedirect(token));
  }

  // ---------- OAuth GitHub ----------
  @Public()
  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  async githubStart(@Req() _req: any, @Query('role') _role?: 'candidate' | 'recruiter') {
    return;
  }

  @Public()
  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: Response) {
    const { token } = await this.auth.loginOrRegisterOAuth({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'github',
      providerId: req.user.providerId,
      requestedRole: req.user.requestedRole,
    });

    return res.redirect(this.auth.buildFrontendOAuthRedirect(token));
  }
}