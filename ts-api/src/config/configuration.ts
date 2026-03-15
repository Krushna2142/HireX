/* eslint-disable prettier/prettier */
// ts-api/src/config/configuration.ts

function parseRedisUrl(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host:     parsed.hostname,
      port:     parseInt(parsed.port || '6379'),
      password: parsed.password || undefined,
      tls:      parsed.protocol === 'rediss:',  // rediss:// = TLS enabled
    };
  } catch {
    return null;
  }
}

export default () => {
  const redisFromUrl = parseRedisUrl(process.env.REDIS_URL);

  return {
    database: {
      host:             process.env.DB_HOST             || 'localhost',
      port:             parseInt(process.env.DB_PORT    || '5432', 10),
      user:             process.env.DB_USER             || 'postgres',
      password:         process.env.DB_PASSWORD         || '',
      name:             process.env.DB_NAME             || 'postgres',
      connectionString: process.env.DATABASE_URL,
    },

    jwt: {
      secret:    process.env.JWT_SECRET    || 'change-me-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model:   process.env.OLLAMA_MODEL    || 'llama3.1:8b',
    },

    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },

    // ── Redis — supports both REDIS_URL (Render/Upstash) and
    //   individual vars (local dev). URL takes precedence.
    redis: {
      host:     redisFromUrl?.host     || process.env.REDIS_HOST     || 'localhost',
      port:     redisFromUrl?.port     || parseInt(process.env.REDIS_PORT || '6379'),
      password: redisFromUrl?.password || process.env.REDIS_PASSWORD || undefined,
      tls:      redisFromUrl?.tls      ?? process.env.REDIS_TLS === 'true',
    },

    frontendUrl:   process.env.FRONTEND_URL   || 'http://localhost:3000',
    pythonApiUrl:  process.env.PYTHON_API_URL,
    pythonApiKey:  process.env.PYTHON_API_KEY,
    serpApiKey:    process.env.SERPAPI_KEY,
    redisUrl:      process.env.REDIS_URL,       // preserved for raw access if needed
  };
};