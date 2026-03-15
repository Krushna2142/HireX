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

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private frontendUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.getOrThrow<string>('jwt.secret');
    this.jwtExpiresIn = this.config.get<string>('jwt.expiresIn') || '7d';
    this.frontendUrl =
      this.config.get<string>('frontendUrl') || 'http://localhost:3000';

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

  private signToken(userId: string, email: string): string {
    return jwt.sign({ sub: userId, email }, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  async register(dto: RegisterDto) {
    const existing = await this.db.query(
      'SELECT id FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await this.db.query(
      `INSERT INTO users (full_name, email, password_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, full_name, email, created_at`,
      [dto.full_name, dto.email.toLowerCase(), passwordHash],
    );

    const user = result.rows[0];
    return {
      token: this.signToken(user.id, user.email),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at,
      },
    };
  }

  async login(dto: LoginDto) {
    const result = await this.db.query(
      'SELECT id, full_name, email, password_hash, created_at FROM users WHERE email = $1',
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
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return {
      token: this.signToken(user.id, user.email),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const result = await this.db.query(
      'SELECT id, email FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    // Prevent email enumeration — always return the same response
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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Reset Your Password</h2>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Reset Password
            </a>
            <p style="margin-top: 16px; color: #64748b; font-size: 14px;">
              This link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
          </div>
        `,
      });
    }

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const result = await this.db.query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
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
    const result = await this.db.query(
      'SELECT id, full_name, email, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }

  // ✅ REMOVED: verifyToken() — JWT verification is now self-contained
  // in JwtAuthGuard via jwt.verify() directly. No service dependency needed.
}