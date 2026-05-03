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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorators';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

type CompleteOAuthSignupDto = {
  onboardingToken: string;
  role: 'candidate' | 'recruiter';
};

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: string;
    sessionId?: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private cookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;

    return header
      .split(';')
      .map((item) => item.trim())
      .map((item) => {
        const idx = item.indexOf('=');
        return idx === -1 ? [item, ''] : [item.slice(0, idx), item.slice(idx + 1)];
      })
      .find(([key]) => key === name)?.[1];
  }

  private meta(req: Request) {
    return {
      ipAddress: String(req.headers['x-forwarded-for'] ?? req.ip ?? ''),
      userAgent: req.headers['user-agent'],
    };
  }

  // ── Register ─────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const issued = await this.auth.register(body, this.meta(req));
    this.auth.setAuthCookies(res, issued);
    return this.auth.toAuthResponse(issued);
  }

  // ── Login ────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const issued = await this.auth.login(body, this.meta(req));
    this.auth.setAuthCookies(res, issued);
    return this.auth.toAuthResponse(issued);
  }

  // ── Refresh Token ────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      this.cookie(req, this.auth.refreshCookieName) ??
      body.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const issued = await this.auth.refreshToken(decodeURIComponent(refreshToken), this.meta(req));
    this.auth.setAuthCookies(res, issued);
    return this.auth.toAuthResponse(issued);
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.cookie(req, this.auth.refreshCookieName);
    const result = await this.auth.logout(
      req.user!.id,
      req.user!.sessionId,
      refreshToken ? decodeURIComponent(refreshToken) : undefined,
      this.meta(req),
    );
    this.auth.clearAuthCookies(res);
    return result;
  }

  // ── Current User ─────────────────────────────────────────────────────────

  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.auth.getMe(req.user!.id);
  }

  // ── Email Verification ──────────────────────────────────────────────────

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.auth.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Req() req: AuthenticatedRequest) {
    return this.auth.resendVerification(req.user!.id);
  }

  // ── Forgot Password ──────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.forgotPassword(body, this.meta(req));
  }

  // ── Reset Password ───────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(body, this.meta(req));
  }

  // ── OAuth: Google ────────────────────────────────────────────────────────

  @Public()
  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  async googleStart(
    @Req() _req: Request,
    @Query('role') _role?: 'candidate' | 'recruiter',
    @Query('mode') _mode?: 'signin' | 'signup',
  ) {
    return;
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
    const result = await this.auth.handleOAuthCallback({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'google',
      providerId: req.user.providerId,
      mode: req.user.mode === 'signup' ? 'signup' : 'signin',
      requestedRole: req.user.requestedRole === 'recruiter' ? 'recruiter' : 'candidate',
    }, this.meta(req));

    if (result.kind === 'login') {
      this.auth.setAuthCookies(res, result.issued);
    }

    return res.redirect(result.redirectUrl);
  }

  // ── OAuth: GitHub ────────────────────────────────────────────────────────

  @Public()
  @Get('oauth/github')
  @UseGuards(AuthGuard('github'))
  async githubStart(
    @Req() _req: Request,
    @Query('role') _role?: 'candidate' | 'recruiter',
    @Query('mode') _mode?: 'signin' | 'signup',
  ) {
    return;
  }

  @Public()
  @Get('oauth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
    const result = await this.auth.handleOAuthCallback({
      email: req.user.email,
      fullName: req.user.fullName,
      provider: 'github',
      providerId: req.user.providerId,
      mode: req.user.mode === 'signup' ? 'signup' : 'signin',
      requestedRole: req.user.requestedRole === 'recruiter' ? 'recruiter' : 'candidate',
    }, this.meta(req));

    if (result.kind === 'login') {
      this.auth.setAuthCookies(res, result.issued);
    }

    return res.redirect(result.redirectUrl);
  }

  // ── OAuth: Complete Signup ───────────────────────────────────────────────

  @Public()
  @Post('oauth/complete-signup')
  @HttpCode(HttpStatus.OK)
  async completeOAuthSignup(
    @Body() body: CompleteOAuthSignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.onboardingToken) {
      throw new BadRequestException('onboardingToken is required');
    }
    if (body.role !== 'candidate' && body.role !== 'recruiter') {
      throw new BadRequestException('role must be candidate or recruiter');
    }

    const issued = await this.auth.completeOAuthSignup(
      body.onboardingToken,
      body.role,
      this.meta(req),
    );
    this.auth.setAuthCookies(res, issued);
    return this.auth.toAuthResponse(issued);
  }
}
