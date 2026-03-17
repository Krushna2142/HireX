/* eslint-disable prettier/prettier */
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg }    from '@prisma/adapter-pg';
import { Pool }        from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        '[PrismaService] DATABASE_URL is not set. ' +
        'Add it to your .env and Render environment variables.',
      );
    }

    // ── SSL fix ────────────────────────────────────────────────────────────
    // When using PrismaPg (driver adapter), DATABASE_URL query params like
    // ?sslmode=no-verify are ignored — SSL must be configured on the pg Pool.
    // Render and Supabase use self-signed certs; rejectUnauthorized: false
    // keeps the connection encrypted but skips certificate chain validation.
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}