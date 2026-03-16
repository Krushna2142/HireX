/* eslint-disable prettier/prettier */
// prisma/prisma.config.ts
import { defineConfig } from 'prisma/config';
import * as fs   from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(line => line.includes('=') && !line.startsWith('#'))
      .map(line => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')];
      }),
  );
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    '[Prisma] DATABASE_URL is not set.\n' +
    'Add to ts-api/.env:\n' +
    'DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"',
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {          // ← correct property name (not datasourceUrl)
    url: databaseUrl,    // ← url lives here in config file, not in schema.prisma
  },
});