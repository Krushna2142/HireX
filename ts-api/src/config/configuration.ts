// ts-api/src/config/configuration.ts
export default () => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'postgres',
    connectionString: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  pythonApiUrl: process.env.PYTHON_API_URL,
  pythonApiKey: process.env.PYTHON_API_KEY,
  serpApiKey: process.env.SERPAPI_KEY,   // ← was missing!
  redisUrl: process.env.REDIS_URL,
});