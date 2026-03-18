/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory }             from '@nestjs/core';
import { ValidationPipe, Logger }  from '@nestjs/common';
import { AppModule }               from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app    = await NestFactory.create(AppModule);

  // ── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      transform:            true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'https://job-crawler-wine.vercel.app',
      'http://localhost:3000',
    ],
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
  });

  const port = process.env.PORT || 3001;

  // ↓ '0.0.0.0' is the critical fix for Railway / any Docker container
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  logger.log(`🔗 Public URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN ?? 'localhost:' + port}`);
}

bootstrap();