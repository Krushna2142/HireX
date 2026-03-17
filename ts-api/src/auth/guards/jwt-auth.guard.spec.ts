/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/guards/jwt-auth.guard.spec.ts
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  const SECRET = 'test-secret';

  beforeEach(() => {
    reflector = new Reflector();
    const config = { get: jest.fn().mockReturnValue(SECRET) } as any;
    guard = new JwtAuthGuard(config, reflector);
  });

  // ✅ Helper to mock ExecutionContext
  const mockContext = (token?: string, isPublic = false): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: token ? `Bearer ${token}` : undefined },
          ip: '127.0.0.1',
          user: {},
        }),
      }),
    } as any;
  };

  it('should allow public routes', async () => {
    const ctx = mockContext(undefined, true); // isPublic = true
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should throw if no token', async () => {
    const ctx = mockContext(); // no token
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if token is expired', async () => {
    const token = jwt.sign({ sub: '1', email: 'a@b.com', role: 'candidate' }, SECRET, { expiresIn: -1 });
    const ctx = mockContext(token);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Token has expired');
  });

  it('should throw if token is invalid', async () => {
    const ctx = mockContext('invalid.token.here');
    await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid token');
  });

  it('should attach user to request on valid token', async () => {
    const token = jwt.sign({ sub: '123', email: 'test@test.com', role: 'candidate' }, SECRET);
    const request: any = {
      headers: { authorization: `Bearer ${token}` },
      ip: '127.0.0.1',
    };
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await guard.canActivate(ctx);

    expect(request.user.id).toBe('123');
    expect(request.user.email).toBe('test@test.com');
    expect(request.user.role).toBe('candidate');
  });
});