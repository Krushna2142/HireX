/* eslint-disable prettier/prettier */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import {
  AuthProvider,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export type AppRole = 'candidate' | 'recruiter' | 'admin' | 'super_admin';
export type PublicSignupRole = 'candidate' | 'recruiter';
export type OAuthProvider = 'google' | 'github';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
}

export interface SafeUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  created_at: Date;
  email_verified: boolean;
}

export interface IssuedAuth {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  user: SafeUser;
}

export interface AuthResponse {
  user: SafeUser;
  accessExpiresAt: Date;
}

const ACCESS_COOKIE = 'jc_access_token';
const REFRESH_COOKIE = 'jc_refresh_token';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter | undefined;
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly frontendUrl: string;
  private readonly secureCookies: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret =
      this.config.get<string>('jwt.accessSecret') ??
      this.config.get<string>('jwt.secret') ??
      this.config.get<string>('JWT_SECRET') ??
      '';
    if (!this.accessSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    this.accessExpiresIn =
      this.config.get<string>('jwt.accessExpiresIn') ??
      this.config.get<string>('jwt.expiresIn') ??
      '15m';
    this.refreshExpiresIn =
      this.config.get<string>('jwt.refreshExpiresIn') ??
      '7d';
    this.frontendUrl =
      this.config.get<string>('frontendUrl') ??
      'http://localhost:3000';
    this.secureCookies =
      this.config.get<string>('nodeEnv') === 'production' ||
      process.env.SECURE_COOKIES === 'true';

    const smtpUser = this.config.get<string>('smtp.user');
    const smtpPass = this.config.get<string>('smtp.pass');

    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('smtp.host'),
        port: this.config.get<number>('smtp.port'),
        secure: this.config.get<number>('smtp.port') === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
  }

  get accessCookieName() {
    return ACCESS_COOKIE;
  }

  get refreshCookieName() {
    return REFRESH_COOKIE;
  }

  // ── Cookie Helpers ───────────────────────────────────────────────────────

  setAuthCookies(res: Response, issued: IssuedAuth): void {
    res.cookie(ACCESS_COOKIE, issued.accessToken, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      path: '/',
      expires: issued.accessExpiresAt,
    });

    res.cookie(REFRESH_COOKIE, issued.refreshToken, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      path: '/api/auth',
      expires: issued.refreshExpiresAt,
    });
  }

  clearAuthCookies(res: Response): void {
    const base = {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax' as const,
    };

    res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/auth' });
  }

  toAuthResponse(issued: IssuedAuth): AuthResponse {
    return {
      user: issued.user,
      accessExpiresAt: issued.accessExpiresAt,
    };
  }

  // ── Role Helpers ─────────────────────────────────────────────────────────

  private toDbRole(role: PublicSignupRole): UserRole {
    return role === 'recruiter' ? UserRole.RECRUITER : UserRole.JOBSEEKER;
  }

  private toAppRole(role: UserRole): AppRole {
    switch (role) {
      case UserRole.RECRUITER:
        return 'recruiter';
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.SUPER_ADMIN:
        return 'super_admin';
      case UserRole.JOBSEEKER:
      default:
        return 'candidate';
    }
  }

  private toOAuthProvider(provider: OAuthProvider): AuthProvider {
    return provider === 'github' ? AuthProvider.GITHUB : AuthProvider.GOOGLE;
  }

  private roleRedirectPath(role: AppRole): string {
    return role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard';
  }

  private toSafeUser(user: Pick<User, 'id' | 'fullName' | 'email' | 'role' | 'createdAt' | 'emailVerified'>): SafeUser {
    return {
      id: user.id,
      full_name: user.fullName ?? '',
      email: user.email,
      role: this.toAppRole(user.role),
      created_at: user.createdAt,
      email_verified: user.emailVerified,
    };
  }

  // ── Token + Hash Helpers ─────────────────────────────────────────────────

  private hash(value: string): Promise<string> {
    return argon2.hash(value, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private verifyHash(hash: string, value: string): Promise<boolean> {
    return argon2.verify(hash, value);
  }

  private randomSecret(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  private opaqueToken(id: string, secret: string): string {
    return `${id}.${secret}`;
  }

  private parseOpaqueToken(token: string): { id: string; secret: string } {
    const [id, secret, ...rest] = token.split('.');
    if (!id || !secret || rest.length) {
      throw new UnauthorizedException('Invalid token format');
    }
    return { id, secret };
  }

  private durationMs(value: string, fallback: number): number {
    const match = /^(\d+)(ms|s|m|h|d)$/i.exec(value.trim());
    if (!match) return fallback;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * multipliers[unit];
  }

  private signAccessToken(user: User, sessionId: string): string {
    return jwt.sign(
      {
        sub: user.id,
        sid: sessionId,
        email: user.email,
        role: this.toAppRole(user.role),
      },
      this.accessSecret,
      { expiresIn: this.accessExpiresIn } as jwt.SignOptions,
    );
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeIp(ipAddress?: string): string | undefined {
    if (!ipAddress) return undefined;
    const first = ipAddress.split(',')[0]?.trim();
    if (!first || first === 'unknown') return undefined;
    return first.replace(/^::ffff:/, '');
  }

  private async audit(action: string, input: {
    actorUserId?: string;
    targetUserId?: string;
    metadata?: Prisma.InputJsonValue;
    meta?: RequestMeta;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          actorUserId: input.actorUserId,
          targetUserId: input.targetUserId,
          ipAddress: this.normalizeIp(input.meta?.ipAddress),
          userAgent: input.meta?.userAgent,
          metadata: input.metadata ?? {},
        },
      });
    } catch (error) {
      this.logger.warn(`Audit log failed for ${action}: ${(error as Error).message}`);
    }
  }

  private async recordLoginAttempt(input: {
    userId?: string;
    email: string;
    success: boolean;
    failureReason?: string;
    meta?: RequestMeta;
  }) {
    try {
      await this.prisma.loginAttempt.create({
        data: {
          userId: input.userId,
          email: this.normalizeEmail(input.email),
          success: input.success,
          failureReason: input.failureReason,
          ipAddress: this.normalizeIp(input.meta?.ipAddress),
          userAgent: input.meta?.userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(`Login attempt log failed: ${(error as Error).message}`);
    }
  }

  private async issueAuth(user: User, meta?: RequestMeta): Promise<IssuedAuth> {
    const now = Date.now();
    const accessExpiresAt = new Date(now + this.durationMs(this.accessExpiresIn, 15 * 60_000));
    const refreshExpiresAt = new Date(now + this.durationMs(this.refreshExpiresIn, 7 * 86_400_000));

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        deviceName: meta?.deviceName,
        ipAddress: this.normalizeIp(meta?.ipAddress),
        userAgent: meta?.userAgent,
        expiresAt: refreshExpiresAt,
        lastUsedAt: new Date(),
      },
    });

    const refreshSecret = this.randomSecret();
    const refreshHash = await this.hash(refreshSecret);

    const refreshRow = await this.prisma.authRefreshToken.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        tokenFamilyId: session.tokenFamilyId,
        tokenHash: refreshHash,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken: this.signAccessToken(user, session.id),
      refreshToken: this.opaqueToken(refreshRow.id, refreshSecret),
      accessExpiresAt,
      refreshExpiresAt,
      user: this.toSafeUser(user),
    };
  }

  private async createVerificationToken(userId: string): Promise<string> {
    const secret = this.randomSecret();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const created = await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: await this.hash(secret),
        expiresAt,
      },
    });

    return this.opaqueToken(created.id, secret);
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    if (!this.transporter) return;

    const token = await this.createVerificationToken(user.id);
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.transporter.sendMail({
      from: `"JobCrawler" <${this.config.get<string>('smtp.user')}>`,
      to: user.email,
      subject: 'Verify your JobCrawler email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0EA5E9;">JobCrawler</h2>
          <p>Verify your email address to finish setting up your account.</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0EA5E9;color:white;text-decoration:none;border-radius:8px;">Verify Email</a>
          <p style="margin-top:20px;color:#64748B;font-size:14px;">This link expires in 24 hours.</p>
        </div>
      `,
    });
  }

  // ── OAuth Redirect Helpers ───────────────────────────────────────────────

  private buildFrontendOAuthRedirect(user: SafeUser): string {
    return `${this.frontendUrl}${this.roleRedirectPath(user.role)}`;
  }

  private signOnboardingToken(payload: {
    email: string;
    fullName: string;
    provider: OAuthProvider;
    providerId: string;
    mode: 'signin' | 'signup';
  }): string {
    return jwt.sign(
      { type: 'oauth_onboarding', ...payload },
      this.accessSecret,
      { expiresIn: '10m' } as jwt.SignOptions,
    );
  }

  private verifyOnboardingToken(token: string): {
    type: 'oauth_onboarding';
    email: string;
    fullName: string;
    provider: OAuthProvider;
    providerId: string;
    mode: 'signin' | 'signup';
  } {
    const decoded = jwt.verify(token, this.accessSecret) as any;
    if (!decoded || decoded.type !== 'oauth_onboarding') {
      throw new UnauthorizedException('Invalid onboarding token');
    }
    return decoded;
  }

  private buildFrontendOAuthOnboardingRedirect(data: {
    onboardingToken: string;
    provider: OAuthProvider;
    mode: 'signin' | 'signup';
    email: string;
    fullName: string;
  }): string {
    const q = new URLSearchParams({
      ot: data.onboardingToken,
      provider: data.provider,
      mode: data.mode,
      email: data.email,
      name: data.fullName,
    });

    return `${this.frontendUrl}/auth/oauth-onboarding?${q.toString()}`;
  }

  // ── User Lookup ──────────────────────────────────────────────────────────

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // ── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, meta?: RequestMeta): Promise<IssuedAuth> {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await this.hash(dto.password);
    const role = this.toDbRole(dto.role);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          fullName: dto.full_name.trim(),
          passwordHash,
          role,
          authAccounts: {
            create: {
              provider: AuthProvider.CREDENTIALS,
              providerAccountId: email,
              providerEmail: email,
              providerEmailVerified: false,
            },
          },
          ...(role === UserRole.RECRUITER
            ? { recruiterProfile: { create: {} } }
            : { jobseekerProfile: { create: {} } }),
        },
      });

      await this.sendVerificationEmail(user);
      const issued = await this.issueAuth(user, meta);
      await this.audit('auth.register', {
        actorUserId: user.id,
        targetUserId: user.id,
        metadata: { role: issued.user.role },
        meta,
      });
      return issued;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  // ── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, meta?: RequestMeta): Promise<IssuedAuth> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.findUserByEmail(email);

    if (!user) {
      await this.recordLoginAttempt({ email, success: false, failureReason: 'not_found', meta });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive || user.isBlocked || user.deletedAt) {
      await this.recordLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'disabled',
        meta,
      });
      throw new UnauthorizedException('Account is not active');
    }

    if (!user.passwordHash) {
      await this.recordLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'password_not_set',
        meta,
      });
      throw new UnauthorizedException(
        'No password set for this account. Please use social login or reset your password.',
      );
    }

    const valid = await this.verifyHash(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordLoginAttempt({
        userId: user.id,
        email,
        success: false,
        failureReason: 'bad_password',
        meta,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        authAccounts: {
          updateMany: {
            where: { provider: AuthProvider.CREDENTIALS },
            data: { lastUsedAt: new Date() },
          },
        },
      },
    });

    await this.recordLoginAttempt({ userId: updated.id, email, success: true, meta });
    const issued = await this.issueAuth(updated, meta);
    await this.audit('auth.login', {
      actorUserId: updated.id,
      targetUserId: updated.id,
      metadata: { provider: 'credentials' },
      meta,
    });
    return issued;
  }

  // ── Refresh Token ────────────────────────────────────────────────────────

  async refreshToken(refreshToken: string, meta?: RequestMeta): Promise<IssuedAuth> {
    const { id, secret } = this.parseOpaqueToken(refreshToken);

    const tokenRow = await this.prisma.authRefreshToken.findUnique({
      where: { id },
      include: {
        user: true,
        session: true,
      },
    });

    if (!tokenRow || tokenRow.expiresAt <= new Date() || tokenRow.revokedAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const valid = await this.verifyHash(tokenRow.tokenHash, secret);
    if (!valid || tokenRow.usedAt) {
      await this.prisma.authSession.updateMany({
        where: { tokenFamilyId: tokenRow.tokenFamilyId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'refresh_token_reuse',
        },
      });
      await this.prisma.authRefreshToken.updateMany({
        where: { tokenFamilyId: tokenRow.tokenFamilyId },
        data: {
          revokedAt: new Date(),
          revokedReason: 'refresh_token_reuse',
          reuseDetectedAt: new Date(),
        },
      });
      this.logger.warn(`Refresh token reuse detected for user ${tokenRow.userId}`);
      throw new UnauthorizedException('Refresh token has been compromised');
    }

    if (tokenRow.session.isRevoked || tokenRow.session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const refreshExpiresAt = new Date(Date.now() + this.durationMs(this.refreshExpiresIn, 7 * 86_400_000));
    const newSecret = this.randomSecret();
    const newToken = await this.prisma.authRefreshToken.create({
      data: {
        sessionId: tokenRow.sessionId,
        userId: tokenRow.userId,
        tokenFamilyId: tokenRow.tokenFamilyId,
        tokenHash: await this.hash(newSecret),
        expiresAt: refreshExpiresAt,
      },
    });

    await this.prisma.$transaction([
      this.prisma.authRefreshToken.update({
        where: { id: tokenRow.id },
        data: {
          usedAt: new Date(),
          replacedByTokenId: newToken.id,
        },
      }),
      this.prisma.authSession.update({
        where: { id: tokenRow.sessionId },
        data: {
          lastUsedAt: new Date(),
          expiresAt: refreshExpiresAt,
          ipAddress: this.normalizeIp(meta?.ipAddress),
          userAgent: meta?.userAgent,
        },
      }),
    ]);

    const accessExpiresAt = new Date(Date.now() + this.durationMs(this.accessExpiresIn, 15 * 60_000));
    return {
      accessToken: this.signAccessToken(tokenRow.user, tokenRow.sessionId),
      refreshToken: this.opaqueToken(newToken.id, newSecret),
      accessExpiresAt,
      refreshExpiresAt,
      user: this.toSafeUser(tokenRow.user),
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, sessionId?: string, refreshToken?: string, meta?: RequestMeta) {
    if (sessionId) {
      await this.prisma.authSession.updateMany({
        where: { id: sessionId, userId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'logout',
        },
      });
      await this.prisma.authRefreshToken.updateMany({
        where: { sessionId, userId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: 'logout',
        },
      });
    } else if (refreshToken) {
      const parsed = this.parseOpaqueToken(refreshToken);
      await this.prisma.authRefreshToken.updateMany({
        where: { id: parsed.id, userId },
        data: {
          revokedAt: new Date(),
          revokedReason: 'logout',
        },
      });
    }

    await this.audit('auth.logout', {
      actorUserId: userId,
      targetUserId: userId,
      meta,
    });

    return { message: 'Logged out successfully' };
  }

  // ── Current User ─────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.findUserById(userId);
    if (!user || !user.isActive || user.isBlocked || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return this.toSafeUser(user);
  }

  // ── Email Verification ──────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const { id, secret } = this.parseOpaqueToken(token);
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!row || row.usedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const valid = await this.verifyHash(row.tokenHash, secret);
    if (!valid) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.emailVerified) return { message: 'Email is already verified' };

    await this.sendVerificationEmail(user);
    return { message: 'Verification email sent' };
  }

  // ── Forgot Password ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto, meta?: RequestMeta) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.findUserByEmail(email);

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const secret = this.randomSecret();
    const reset = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.hash(secret),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    if (this.transporter) {
      const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(this.opaqueToken(reset.id, secret))}`;
      await this.transporter.sendMail({
        from: `"JobCrawler" <${this.config.get<string>('smtp.user')}>`,
        to: user.email,
        subject: 'Password Reset - JobCrawler',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0EA5E9;">JobCrawler</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0EA5E9;color:white;text-decoration:none;border-radius:8px;">Reset Password</a>
            <p style="margin-top:20px;color:#64748B;font-size:14px;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
          </div>
        `,
      });
    }

    await this.audit('auth.password_reset_requested', {
      targetUserId: user.id,
      metadata: { email },
      meta,
    });

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  // ── Reset Password ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto, meta?: RequestMeta) {
    const { id, secret } = this.parseOpaqueToken(dto.token);
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!row || row.usedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const valid = await this.verifyHash(row.tokenHash, secret);
    if (!valid) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.hash(dto.new_password);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          authAccounts: {
            upsert: {
              where: {
                userId_provider: {
                  userId: row.userId,
                  provider: AuthProvider.CREDENTIALS,
                },
              },
              create: {
                provider: AuthProvider.CREDENTIALS,
                providerAccountId: row.user.email,
                providerEmail: row.user.email,
                providerEmailVerified: row.user.emailVerified,
              },
              update: {
                providerEmail: row.user.email,
                providerEmailVerified: row.user.emailVerified,
              },
            },
          },
        },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: row.userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      }),
      this.prisma.authRefreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      }),
    ]);

    await this.audit('auth.password_reset_completed', {
      actorUserId: row.userId,
      targetUserId: row.userId,
      meta,
    });

    return { message: 'Password reset successful. You can now log in.' };
  }

  // ── OAuth ────────────────────────────────────────────────────────────────

  async handleOAuthCallback(input: {
    email: string;
    fullName: string;
    provider: OAuthProvider;
    providerId: string;
    mode: 'signin' | 'signup';
    requestedRole: PublicSignupRole;
  }, meta?: RequestMeta) {
    const email = this.normalizeEmail(input.email);
    const existing = await this.findUserByEmail(email);

    if (existing) {
      const existingRole = this.toAppRole(existing.role);
      if (input.mode === 'signin' && existingRole !== input.requestedRole) {
        return {
          kind: 'role_mismatch' as const,
          redirectUrl: `${this.frontendUrl}/?auth=login&error=role_mismatch&expected=${existingRole}`,
        };
      }

      await this.prisma.authAccount.upsert({
        where: {
          userId_provider: {
            userId: existing.id,
            provider: this.toOAuthProvider(input.provider),
          },
        },
        create: {
          userId: existing.id,
          provider: this.toOAuthProvider(input.provider),
          providerAccountId: input.providerId,
          providerEmail: email,
          providerEmailVerified: true,
          lastUsedAt: new Date(),
        },
        update: {
          providerAccountId: input.providerId,
          providerEmail: email,
          providerEmailVerified: true,
          lastUsedAt: new Date(),
        },
      });

      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
      const issued = await this.issueAuth(user, meta);

      return {
        kind: 'login' as const,
        redirectUrl: this.buildFrontendOAuthRedirect(issued.user),
        issued,
      };
    }

    const onboardingToken = this.signOnboardingToken({
      email,
      fullName: input.fullName,
      provider: input.provider,
      providerId: input.providerId,
      mode: input.mode,
    });

    return {
      kind: 'onboarding' as const,
      redirectUrl: this.buildFrontendOAuthOnboardingRedirect({
        onboardingToken,
        provider: input.provider,
        mode: input.mode,
        email,
        fullName: input.fullName,
      }),
    };
  }

  async completeOAuthSignup(
    onboardingToken: string,
    role: PublicSignupRole,
    meta?: RequestMeta,
  ): Promise<IssuedAuth> {
    const data = this.verifyOnboardingToken(onboardingToken);
    const email = this.normalizeEmail(data.email);
    const provider = this.toOAuthProvider(data.provider);
    const existing = await this.findUserByEmail(email);

    if (existing) {
      const existingRole = this.toAppRole(existing.role);
      if (data.mode === 'signup' && existingRole !== role) {
        throw new ConflictException(`Account already exists as ${existingRole}`);
      }

      await this.prisma.authAccount.upsert({
        where: {
          userId_provider: {
            userId: existing.id,
            provider,
          },
        },
        create: {
          userId: existing.id,
          provider,
          providerAccountId: data.providerId,
          providerEmail: email,
          providerEmailVerified: true,
          lastUsedAt: new Date(),
        },
        update: {
          providerAccountId: data.providerId,
          providerEmail: email,
          providerEmailVerified: true,
          lastUsedAt: new Date(),
        },
      });

      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
      return this.issueAuth(updated, meta);
    }

    const dbRole = this.toDbRole(role);
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: data.fullName,
        role: dbRole,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authAccounts: {
          create: {
            provider,
            providerAccountId: data.providerId,
            providerEmail: email,
            providerEmailVerified: true,
            lastUsedAt: new Date(),
          },
        },
        ...(dbRole === UserRole.RECRUITER
          ? { recruiterProfile: { create: {} } }
          : { jobseekerProfile: { create: {} } }),
      },
    });

    const issued = await this.issueAuth(user, meta);
    await this.audit('auth.oauth_signup', {
      actorUserId: user.id,
      targetUserId: user.id,
      metadata: { provider: data.provider, role },
      meta,
    });
    return issued;
  }
}
