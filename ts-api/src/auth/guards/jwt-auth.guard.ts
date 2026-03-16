/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector }     from '@nestjs/core';
import * as jwt          from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorators';

interface JwtPayload {
  sub:   string;
  email: string;
  role:  string;
  iat?:  number;
  exp?:  number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly config:    ConfigService,
    private readonly reflector: Reflector,
  ) {
    const secret = this.config.get<string>('JWT_SECRET');

    // ✅ Crash early at startup if secret is missing — better than silent failure
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    this.jwtSecret = secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ✅ Honor @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // ✅ Extract token safely
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;

      // ✅ Validate payload has required fields
      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException('Token payload is incomplete');
      }

      // ✅ Attach user to request — RolesGuard reads from here
      request.user = {
        id:    payload.sub,
        email: payload.email,
        role:  payload.role,
        iat:   payload.iat,
        exp:   payload.exp,
      };

      return true;
    } catch (err) {
      // ✅ Granular error messages
      if (err instanceof jwt.TokenExpiredError) {
        this.logger.warn(`Expired token used by: ${this.getIp(request)}`);
        throw new UnauthorizedException('Token has expired — please log in again');
      }

      if (err instanceof jwt.JsonWebTokenError) {
        this.logger.warn(`Invalid token from IP: ${this.getIp(request)}`);
        throw new UnauthorizedException('Invalid token');
      }

      if (err instanceof jwt.NotBeforeError) {
        throw new UnauthorizedException('Token not yet valid');
      }

      // ✅ Re-throw UnauthorizedException from payload validation above
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      // ✅ Unknown errors — don't leak internals
      this.logger.error('Unexpected JWT error', err);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  // ✅ Clean token extraction — handles edge cases
  private extractToken(request: any): string | null {
    const authHeader = request.headers?.['authorization'] as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  // ✅ Safe IP extraction for logging
  private getIp(request: any): string {
    return (
      request.headers?.['x-forwarded-for'] ||
      request.ip ||
      'unknown'
    );
  }
}