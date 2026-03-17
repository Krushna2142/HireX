/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/auth/guards/roles.guard.spec.ts
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (role: string, requiredRoles: string[]) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    } as any;
  };

  it('should allow if no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const ctx = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({}) }) } as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow matching role', () => {
    const ctx = mockContext('admin', ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny non-matching role', () => {
    const ctx = mockContext('candidate', ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});