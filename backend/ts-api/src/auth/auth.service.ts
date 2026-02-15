import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('supabase.url') || '',
      this.configService.get('supabase.anonKey') || '',
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
