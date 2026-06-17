/* eslint-disable prettier/prettier */
// ts-api/src/queues/redis-connection.ts

import '../config/load-env';
import { URL } from 'url';

export type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
  maxRetriesPerRequest: null;
};

export function getRedisConnection(): RedisConnectionOptions {
  const redisUrl =
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_CONNECTION_STRING ||
    'redis://localhost:6379';

  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    tls: isTls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}