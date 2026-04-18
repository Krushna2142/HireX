import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService, // ← ADD THIS
  ) {
    const connectionString = this.config.get<string>('database.connectionString');

    if (!connectionString) {
      throw new Error(
        '[DatabaseService] DATABASE_URL is not set. ' +
        'Ensure the environment variable is configured in your deployment.',
      );
    }

    const cleanConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/g, '')
      .replace(/[?&]ssl=[^&]*/g, '')
      .replace(/\?$/, '');

    this.pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected pg pool error: ${err.message}`, err.stack);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      // Test pg connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('✅ PostgreSQL pool connected.');

      // Test Prisma connection
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('✅ Prisma connected.');
    } catch (error) {
      this.logger.error(
        `[FATAL] Cannot connect to database: ${(error as Error).message}`,
        (error as Error).stack,
      );
      process.exit(1);
    }
  }

  /**
   * Use raw pg pool (legacy queries)
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

  /**
   * Get Prisma client (for new features)
   */
  getPrisma() {
    return this.prisma;
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
    await this.prisma.$disconnect();
    this.logger.log('Database connections closed.');
  }
}