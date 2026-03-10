/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class AuthService implements OnModuleInit {
  private transporter: Transporter;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ userId, email });
  }

  async register(fullName: string, email: string, password: string) {
    const { data: existing } = await this.supabase
      .getClient()
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .insert({ full_name: fullName, email, password_hash: passwordHash })
      .select('id, email, full_name, created_at')
      .single();

    if (error) throw new Error(error.message);

    const token = this.signToken(user.id, user.email);
    return { token, user };
  }

  async login(email: string, password: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .select('id, email, full_name, password_hash, created_at')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { password_hash: _, ...userWithoutHash } = user;
    const token = this.signToken(user.id, user.email);
    return { token, user: userWithoutHash };
  }

  async forgotPassword(email: string) {
    const { data: user } = await this.supabase
      .getClient()
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    // Always return success to avoid email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await this.supabase
      .getClient()
      .from('users')
      .update({ reset_token: resetToken, reset_token_expiry: expiry })
      .eq('id', user.id);

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const smtpUser = this.config.get<string>('SMTP_USER');

    await this.transporter.sendMail({
      from: `"JobCrawler" <${smtpUser}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h2 style="color:#4f46e5;">Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
          <p style="color:#6b7280;font-size:14px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .select('id, reset_token_expiry')
      .eq('reset_token', token)
      .maybeSingle();

    if (error || !user) throw new NotFoundException('Invalid or expired reset token');

    if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.supabase
      .getClient()
      .from('users')
      .update({ password_hash: passwordHash, reset_token: null, reset_token_expiry: null })
      .eq('id', user.id);

    return { message: 'Password updated successfully' };
  }

  async getMe(userId: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) throw new NotFoundException('User not found');
    return user;
  }
}