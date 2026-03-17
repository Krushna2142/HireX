import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>('database.connectionString');

    if (!connectionString) {
      throw new Error(
        '[DatabaseService] DATABASE_URL is not set. ' +
        'Ensure the environment variable is configured in your deployment.',
      );
    }

    // ── Strip sslmode from the connection string so pg Pool config controls SSL ──
    // Supabase pooler URLs include ?sslmode=require which causes pg to attempt
    // full certificate verification — conflicting with rejectUnauthorized: false.
    // We remove it from the URL and handle SSL entirely via the pool config object.
    const cleanConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/g, '')   // remove sslmode param
      .replace(/[?&]ssl=[^&]*/g, '')        // remove ssl param (if present)
      .replace(/\?$/, '');                  // clean trailing ? if it was the only param

    this.pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,  // ← Supabase uses self-signed intermediate CA
      },
      max:                    10,
      idleTimeoutMillis:   30_000,
      connectionTimeoutMillis: 5_000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected pg pool error: ${err.message}`, err.stack);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('✅ Database connection established successfully.');
    } catch (error) {
      this.logger.error(
        `[FATAL] Cannot connect to database: ${(error as Error).message}`,
        (error as Error).stack,
      );
      process.exit(1);
    }
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start  = Date.now();
    const client = await this.pool.connect();

    try {
      const result   = await client.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${text.substring(0, 100)}...`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Query failed: ${(error as Error).message}\nSQL: ${text.substring(0, 200)}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Transaction rolled back: ${(error as Error).message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed.');
  }
}
