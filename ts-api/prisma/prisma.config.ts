/* eslint-disable prettier/prettier */
import { defineConfig } from 'prisma/config';
import * as fs from 'fs';
import * as path from 'path';

function readEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const [k, ...v] = l.split('=');
        return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const env = readEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env.DATABASE_URL || process.env.DATABASE_URL,
  },
});