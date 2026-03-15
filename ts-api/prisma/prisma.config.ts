// prisma.config.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import { defineConfig } from 'prisma/config';

// Load .env explicitly — Prisma CLI runs in its own context
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});