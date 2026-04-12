/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://job-crawler-wine.vercel.app',
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server / health checks / curl requests without origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;

  // Render/Docker compatible host binding
  await app.listen(port, '0.0.0.0');

  const publicUrl =
    process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`🔗 Public URL: ${publicUrl}`);
  logger.log(`✅ Allowed CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();