/* eslint-disable prettier/prettier */
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from './app.module';

function parseOrigins(value?: string): string[] {
  return String(value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Request ID middleware
function requestIdMiddleware(req: any, res: any, next: () => void) {
  const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || uuidv4();
  
  // Validate incoming request ID (prevent malformed/oversized)
  const validatedId = requestId.length <= 64 && /^[a-zA-Z0-9\-_]+$/.test(requestId)
    ? requestId
    : uuidv4();
  
  req.requestId = validatedId;
  res.setHeader('x-request-id', validatedId);
  
  // Add to response locals for logging
  res.locals = res.locals || {};
  res.locals.requestId = validatedId;
  
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://job-crawler-wine.vercel.app',
    'http://localhost:8000',
   
    ...parseOrigins(process.env.FRONTEND_URL),
    ...parseOrigins(process.env.CORS_ORIGINS),
  ];

  app.enableCors({
    origin(origin, callback) {
      // Allow server-to-server / Postman / curl requests with no Origin.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'Accept',
      'Origin',
      'x-request-id',
      'x-intended-role', // sent by frontend AuthProvider on /auth/me
    ],
    exposedHeaders: ['Content-Length', 'x-request-id'],
  });

  // Request ID middleware (before other middleware)
  app.use(requestIdMiddleware);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3001;

  await app.listen(port, '0.0.0.0');
}

void bootstrap();