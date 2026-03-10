/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  private supabase;

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async register(data: { full_name: string; email: string; password: string; role: string }) {
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        full_name: data.full_name,
        email: data.email,
        password_hash: passwordHash,
        role: data.role,
      })
      .select('id, full_name, email, role, created_at')
      .single();

    if (error) throw new Error(error.message);

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user };
  }

  async login(data: { email: string; password: string }) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, full_name, email, password_hash, role, created_at')
      .eq('email', data.email)
      .single();

    if (error || !user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { password_hash: _ph, ...userWithoutHash } = user;
    return { token, user: userWithoutHash };
  }

  async forgotPassword(email: string) {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await this.supabase
        .from('users')
        .update({ reset_token: resetToken, reset_token_expiry: expiry })
        .eq('id', user.id);

      const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.mailService.sendPasswordReset(user.email, user.full_name, resetLink);
    }

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, reset_token_expiry')
      .eq('reset_token', token)
      .single();

    if (error || !user) throw new BadRequestException('Invalid or expired reset token');

    const expiry = new Date(user.reset_token_expiry);
    if (expiry < new Date()) throw new BadRequestException('Reset token has expired');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await this.supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq('id', user.id);

    if (updateError) throw new Error(updateError.message);

    return { message: 'Password updated successfully' };
  }

  async getMe(userId: number) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) throw new NotFoundException('User not found');

    return user;
  }
}