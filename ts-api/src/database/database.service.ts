import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>('database.connectionString');

    if (connectionString) {
      this.pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    } else {
      this.pool = new Pool({
        host: this.config.get<string>('database.host'),
        port: this.config.get<number>('database.port'),
        user: this.config.get<string>('database.user'),
        password: this.config.get<string>('database.password'),
        database: this.config.get<string>('database.name'),
      });
    }
  }

  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}