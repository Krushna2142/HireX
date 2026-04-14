/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  password_hash: string;
  created_at: Date;
}

interface UserIdEmailRow {
  id: string;
  email: string;
}

interface UserIdRow {
  id: string;
}

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter | undefined;
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.getOrThrow<string>('jwt.secret');
    this.jwtExpiresIn = this.config.get<string>('jwt.expiresIn') || '7d';
    this.frontendUrl = this.config.get<string>('frontendUrl') || 'http://localhost:3000';

    const smtpUser = this.config.get<string>('smtp.user');
    const smtpPass = this.config.get<string>('smtp.pass');

    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('smtp.host'),
        port: this.config.get<number>('smtp.port'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
  }

  private signToken(userId: string, email: string, role: string): string {
    return jwt.sign({ sub: userId, email, role }, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  buildFrontendOAuthRedirect(token: string): string {
    return `${this.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`;
  }

  private signOnboardingToken(payload: {
    email: string;
    fullName: string;
    provider: 'google' | 'github';
    providerId: string;
    mode: 'signin' | 'signup';
  }): string {
    return jwt.sign(
      { type: 'oauth_onboarding', ...payload },
      this.jwtSecret,
      { expiresIn: '10m' } as jwt.SignOptions,
    );
  }

  private verifyOnboardingToken(token: string): {
    type: 'oauth_onboarding';
    email: string;
    fullName: string;
    provider: 'google' | 'github';
    providerId: string;
    mode: 'signin' | 'signup';
  } {
    const decoded = jwt.verify(token, this.jwtSecret) as any;
    if (!decoded || decoded.type !== 'oauth_onboarding') {
      throw new UnauthorizedException('Invalid onboarding token');
    }
    return decoded;
  }

  buildFrontendOAuthOnboardingRedirect(data: {
    onboardingToken: string;
    provider: 'google' | 'github';
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

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, full_name, email, role, password_hash, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  async handleOAuthCallback(input: {
  email: string;
  fullName: string;
  provider: 'google' | 'github';
  providerId: string;
  mode: 'signin' | 'signup';
  requestedRole: 'candidate' | 'recruiter'; // add this
}) {
  const existing = await this.findUserByEmail(input.email);

  if (existing) {
    // ✅ Enforce role on OAuth sign-in
    if (input.mode === 'signin' && existing.role !== input.requestedRole) {
      return {
        kind: 'role_mismatch' as const,
        redirectUrl: `${this.frontendUrl}/?auth=login&error=role_mismatch&expected=${existing.role}`,
      };
    }

    return {
      kind: 'login' as const,
      redirectUrl: this.buildFrontendOAuthRedirect(
        this.signToken(existing.id, existing.email, existing.role),
      ),
    };
  }

  const onboardingToken = this.signOnboardingToken({
    email: input.email.toLowerCase(),
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
      email: input.email.toLowerCase(),
      fullName: input.fullName,
    }),
  };
}

  async completeOAuthSignup(onboardingToken: string, role: 'candidate' | 'recruiter') {
  const data = this.verifyOnboardingToken(onboardingToken);
  const existing = await this.findUserByEmail(data.email);

  if (existing) {
    // IMPORTANT: if this is signup flow, do not silently login wrong role
    if (data.mode === 'signup' && existing.role !== role) {
      throw new ConflictException(`Account already exists as ${existing.role}`);
    }

    return {
      token: this.signToken(existing.id, existing.email, existing.role),
      user: {
        id: existing.id,
        full_name: existing.full_name,
        email: existing.email,
        role: existing.role,
        created_at: existing.created_at,
      },
    };
  }

  const created = await this.db.query<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, full_name, email, role, password_hash, created_at`,
    [data.fullName, data.email.toLowerCase(), null, role],
  );

  const user = created.rows[0];

  return {
    token: this.signToken(user.id, user.email, user.role),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  };
}

  async register(dto: RegisterDto) {
    const existing = await this.db.query<UserIdRow>(
      'SELECT id FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.db.query<UserRow>(
      `INSERT INTO users (full_name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, full_name, email, role, created_at`,
      [dto.full_name, dto.email.toLowerCase(), passwordHash, dto.role],
    );

    const user = result.rows[0];

    return {
      token: this.signToken(user.id, user.email, user.role),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    };
  }

  async login(dto: LoginDto) {
    const result = await this.db.query<UserRow>(
      `SELECT id, full_name, email, password_hash, role, created_at
       FROM users WHERE email = $1`,
      [dto.email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      throw new UnauthorizedException(
        'No password set for this account. Please reset your password.',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      token: this.signToken(user.id, user.email, user.role),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const result = await this.db.query<UserIdEmailRow>(
      'SELECT id, email FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.db.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, expiry, user.id],
    );

    if (this.transporter) {
      const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      await this.transporter.sendMail({
        from: `"Job Crawler" <${this.config.get<string>('smtp.user')}>`,
        to: user.email,
        subject: 'Password Reset — Job Crawler',
        html: `<p>Reset password: <a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    }

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const result = await this.db.query<UserIdRow>(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [dto.token],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = result.rows[0];
    const passwordHash = await bcrypt.hash(dto.new_password, 12);

    await this.db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [passwordHash, user.id],
    );

    return { message: 'Password reset successful. You can now log in.' };
  }

  async getMe(userId: string) {
    const result = await this.db.query<UserRow>(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }
}