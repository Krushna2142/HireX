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
      // Fail at construction time — not silently at first query
      throw new Error(
        '[DatabaseService] DATABASE_URL is not set. ' +
          'Ensure the environment variable is configured in your deployment.',
      );
    }

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Required for Supabase / Render managed DBs
      // Production pool tuning
      max: 10,                  // Max concurrent connections
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 5000, // Fail fast if DB unreachable
    });

    // Surface pool-level errors (e.g. dropped connections) without crashing
    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected pg pool error: ${err.message}`, err.stack);
    });
  }

  /**
   * Verifies database connectivity at application startup.
   * Crashes the process immediately if the DB is unreachable,
   * giving a clear error in deploy logs rather than a silent mid-job failure.
   */
  async onModuleInit(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('Database connection established successfully.');
    } catch (error) {
      this.logger.error(
        `[FATAL] Cannot connect to database: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Exit so Render/Docker restarts the service with a clear failure reason
      process.exit(1);
    }
  }

  /**
   * Generic query executor with full error context.
   */
  async query<T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const client = await this.pool.connect();

    try {
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;

      // Log slow queries in production for performance monitoring
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
      throw error; // Re-throw so callers can handle appropriately
    } finally {
      client.release();
    }
  }

  /**
   * Returns a raw client for transactions.
   * Caller is responsible for releasing the client.
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Executes multiple queries within a single transaction.
   * Automatically commits on success, rolls back on any failure.
   */
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
      this.logger.error(
        `Transaction rolled back: ${(error as Error).message}`,
      );
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