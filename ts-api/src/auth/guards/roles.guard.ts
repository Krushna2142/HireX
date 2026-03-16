/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/auth/guards/roles.guard.ts
/* eslint-disable prettier/prettier */
import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorators';    // ← correct import

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator on this route — allow through
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Support both direct role and Supabase user_metadata.role
    const userRole: string | null =
      user.role ?? user.user_metadata?.role ?? null;

    if (!requiredRoles.includes(userRole ?? '')) {
      throw new ForbiddenException(
        `Requires role: ${requiredRoles.join(' or ')} — your role: ${userRole ?? 'none'}`,
      );
    }

    return true;
  }
}