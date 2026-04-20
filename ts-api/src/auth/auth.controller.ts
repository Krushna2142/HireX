/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

import { AuthService, UserRow } from './auth.service';
import { Public } from './decorators/public.decorators';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type CompleteOAuthSignupDto = {
  onboardingToken: string;
  role: 'candidate' | 'recruiter';
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

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
    return this.auth.getMe(req.user.id, req.user.role);
  }

  @Public()
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  async googleStart(
    @Req() _req: any,
    @Query('role') _role?: 'candidate' | 'recruiter',
    @Query('mode') _mode?: 'signin' | 'signup',
  ) {
    return;
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.auth.handleOAuthCallback({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'google',
      providerId: req.user.providerId,
      mode: req.user.mode === 'signup' ? 'signup' : 'signin',
      requestedRole: req.user.requestedRole === 'recruiter' ? 'recruiter' : 'candidate',
    });

    return res.redirect(result.redirectUrl);
  }

  @Public()
  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  async githubStart(
    @Req() _req: any,
    @Query('role') _role?: 'candidate' | 'recruiter',
    @Query('mode') _mode?: 'signin' | 'signup',
  ) {
    return;
  }

  @Public()
  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.auth.handleOAuthCallback({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'github',
      providerId: req.user.providerId,
      mode: req.user.mode === 'signup' ? 'signup' : 'signin',
      requestedRole: req.user.requestedRole === 'recruiter' ? 'recruiter' : 'candidate',
    });

    return res.redirect(result.redirectUrl);
  }

  @Public()
  @Post('oauth/complete-signup')
  async completeOAuthSignup(@Body() body: CompleteOAuthSignupDto) {
    if (!body?.onboardingToken) {
      throw new BadRequestException('onboardingToken is required');
    }
    if (body.role !== 'candidate' && body.role !== 'recruiter') {
      throw new BadRequestException('role must be candidate or recruiter');
    }
    return this.auth.completeOAuthSignup(body.onboardingToken, body.role);
  }
}
