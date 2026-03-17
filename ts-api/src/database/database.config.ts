// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  connectionString: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
}));