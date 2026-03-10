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
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  private supabase;

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_ANON_KEY'),
    );
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    role: string,
  ) {
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { error } = await this.supabase.from('users').insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role: role || 'candidate',
    });

    if (error) throw new Error(error.message);

    return { message: 'Account created successfully' };
  }

  async login(email: string, password: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, full_name, email, role, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: this.config.getOrThrow('JWT_SECRET') },
    );

    return {
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async forgotPassword(email: string) {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await this.supabase
        .from('users')
        .update({ reset_token: resetToken, reset_token_expiry: expiry })
        .eq('id', user.id);

      await this.mailService.sendResetEmail(user.email, resetToken);
    }

    return {
      message:
        'If that email is registered, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const now = new Date().toISOString();

    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, reset_token_expiry')
      .eq('reset_token', token)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    if (!user.reset_token_expiry || user.reset_token_expiry < now) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq('id', user.id);

    return { message: 'Password updated successfully' };
  }

  async getMe(userId: number) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    };
  }
}