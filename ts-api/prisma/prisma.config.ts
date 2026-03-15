// prisma.config.ts
import path from 'path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasourceUrl: process.env.DATABASE_URL,
});