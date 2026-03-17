/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory }              from '@nestjs/core';
import { ValidationPipe, Logger }  from '@nestjs/common';
import { AppModule }               from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app    = await NestFactory.create(AppModule);

  // ── Global prefix — set BEFORE listen, with health excluded ────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health'],   // GET /health works without /api prefix
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      transform:            true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      'https://job-crawler-wine.vercel.app',
      'http://localhost:3000',
    ],
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap(); // ← THIS IS THE FIX — was commented out