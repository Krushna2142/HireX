// src/database/supabase.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  rpc(arg0: string, arg1: { query_embedding: any; match_threshold: number; match_count: number; }): { data: any; error: any; } | PromiseLike<{ data: any; error: any; }> {
    throw new Error('Method not implemented.');
  }
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const supabaseKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SupabaseService: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  /**
   * Returns the Supabase client instance.
   * Used by services to perform DB operations.
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}