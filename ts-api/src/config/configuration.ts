/* eslint-disable prettier/prettier */
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  jwt: {
    secret:    process.env.JWT_SECRET ?? 'supersecretkey',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  supabase: {
    url:            process.env.SUPABASE_URL ?? '',
    anonKey:        process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model:  process.env.GEMINI_MODEL   ?? 'gemini-1.5-flash',
  },

  // Redis — supports both URL format (Upstash/Railway) and host/port (self-hosted)
  redis: {
    enabled:  process.env.REDIS_ENABLED === 'true' || !!process.env.REDIS_URL || !!process.env.REDIS_HOST,
    url:      process.env.REDIS_URL      ?? null,  // ← primary, used by BullMQ
    host:     process.env.REDIS_HOST     ?? null,
    port:     parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls:      process.env.REDIS_TLS      === 'true',
  },

  serpApiKey: process.env.SERPAPI_KEY ?? '',

  database: {
  connectionString: process.env.DATABASE_URL ?? '',
},

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});