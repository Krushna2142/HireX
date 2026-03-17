/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ✅ Register
  it('POST /auth/register → 201', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ full_name: 'Test User', email: 'test@test.com', password: 'test@123' })
      .expect(201);
  });

  // ✅ Login
  it('POST /auth/login → 200 with token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'test@123' })
      .expect(200);

    expect(res.body.access_token).toBeDefined();
  });

  // ✅ Login with wrong password
  it('POST /auth/login → 401 on wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' })
      .expect(401);
  });

  // ✅ Protected route without token
  it('GET /jobs → 401 without token', () => {
    return request(app.getHttpServer())
      .get('/jobs')
      .expect(401);
  });

  // ✅ Protected route with valid token
  it('GET /jobs → 200 with valid token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'test@123' });

    return request(app.getHttpServer())
      .get('/jobs')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`)
      .expect(200);
  });
});