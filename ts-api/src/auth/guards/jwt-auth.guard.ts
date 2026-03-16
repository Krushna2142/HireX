/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector }      from '@nestjs/core';
import * as jwt           from 'jsonwebtoken';
import { ConfigService }  from '@nestjs/config';
import { IS_PUBLIC_KEY }  from '../decorators/public.decorators';

// ── JWT payload shape — must match exactly what your auth service signs ───────
interface JwtPayload {
  sub:   string;
  email: string;
  role:  string;   // ← 'candidate' | 'recruiter' | 'admin'
  iat?:  number;
  exp?:  number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly config:    ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.jwtSecret = this.config.get<string>('jwt.secret') ?? 'supersecretkey';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Honor @Public() — bypass auth entirely for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request    = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;

      // Attach full user context — role is required by RolesGuard
      request.user = {
        id:    payload.sub,
        email: payload.email,
        role:  payload.role,   // ← this is what RolesGuard reads
      };

      return true;
    } catch (err) {
      const message = err instanceof jwt.TokenExpiredError
        ? 'Token has expired — please log in again'
        : 'Invalid token';
      throw new UnauthorizedException(message);
    }
  }
}