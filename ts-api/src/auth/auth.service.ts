/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private supabase;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('supabase.url'),
      this.config.getOrThrow('supabase.anonKey'),
    );
  }

  async createCredentials(data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const { error } = await this.supabase.from('users').insert({
      firebase_uid: data.firebase_uid,
      username: data.username,
      password_hash: passwordHash,
      role: data.role,
    });

    if (error) throw new Error(error.message);
    return { message: 'Created' };
  }

  async verifyCredentials(data: any) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('password_hash')
      .eq('firebase_uid', data.firebase_uid)
      .eq('username', data.username)
      .single();

    if (error || !user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    return { message: 'Verified' };
  }
}