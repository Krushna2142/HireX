/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorators';
import { getSupabaseServiceClient } from '../../lib/supabase';

interface JwtPayload {
  sub: string;
  sid: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      this.config.get<string>('jwt.accessSecret') ??
      this.config.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    this.jwtSecret = secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    // Supabase (Google) access tokens are not signed with our secret.
    // Resolve them to the canonical HireX user (same id as credentials login).
    if (this.looksLikeSupabaseToken(token)) {
      return this.authenticateSupabase(token, request);
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;

      if (!payload.sub || !payload.sid || !payload.email || !payload.role) {
        throw new UnauthorizedException('Token payload is incomplete');
      }

      const session = await this.prisma.authSession.findUnique({
        where: { id: payload.sid },
        include: { user: true },
      });

      if (
        !session ||
        session.userId !== payload.sub ||
        session.isRevoked ||
        session.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException('Session expired');
      }

      if (
        !session.user.isActive ||
        session.user.isBlocked ||
        session.user.deletedAt
      ) {
        throw new UnauthorizedException('Account is not active');
      }

      request.user = {
        id: session.user.id,
        sessionId: session.id,
        email: session.user.email,
        role: this.toAppRole(session.user.role),
        iat: payload.iat,
        exp: payload.exp,
      };

      return true;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        this.logger.warn(`Expired token used by: ${this.getIp(request)}`);
        throw new UnauthorizedException('Token has expired - please log in again');
      }

      if (err instanceof jwt.JsonWebTokenError) {
        this.logger.warn(`Invalid token from IP: ${this.getIp(request)}`);
        throw new UnauthorizedException('Invalid token');
      }

      if (err instanceof jwt.NotBeforeError) {
        throw new UnauthorizedException('Token not yet valid');
      }

      if (err instanceof UnauthorizedException) {
        throw err;
      }

      this.logger.error('Unexpected JWT error', err);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /** Supabase JWTs carry an `aud` claim ('authenticated'); our own tokens do not. */
  private looksLikeSupabaseToken(token: string): boolean {
    const decoded = jwt.decode(token);
    return (
      !!decoded &&
      typeof decoded === 'object' &&
      (decoded as any).aud === 'authenticated' &&
      !(decoded as any).sid
    );
  }

  /**
   * Resolution order (never creates a user, never overwrites one):
   *  1. auth_accounts GOOGLE + provider_account_id = supabase user id
   *  2. verified, normalized email match -> link provider to that existing user
   */
  private async authenticateSupabase(token: string, request: any): Promise<boolean> {
    const { data, error } = await getSupabaseServiceClient().auth.getUser(token);
    const sbUser = data?.user;
    if (error || !sbUser) {
      this.logger.warn(`Invalid Supabase token from IP: ${this.getIp(request)}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    let user: User | null = null;

    const link = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: AuthProvider.GOOGLE,
          providerAccountId: sbUser.id,
        },
      },
      include: { user: true },
    });
    if (link) user = link.user;

    if (!user) {
      const email = sbUser.email?.trim().toLowerCase();
      if (!email || !sbUser.email_confirmed_at) {
        throw new UnauthorizedException('Verified email required');
      }
      user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      try {
        await this.prisma.authAccount.create({
          data: {
            userId: user.id,
            provider: AuthProvider.GOOGLE,
            providerAccountId: sbUser.id,
            providerEmail: email,
            providerEmailVerified: true,
            lastUsedAt: new Date(),
          },
        });
      } catch {
        // already linked (unique constraint) - fine, identity is still resolved by email
      }
    }

    if (!user.isActive || user.isBlocked || user.deletedAt) {
      throw new UnauthorizedException('Account is not active');
    }

    request.user = {
      id: user.id, // canonical users.id
      sessionId: undefined,
      email: user.email,
      role: this.toAppRole(user.role),
    };
    return true;
  }

   private toAppRole(role: UserRole): string {
    switch (role) {
      case UserRole.RECRUITER:
        return 'recruiter';
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.SUPER_ADMIN:
        return 'super_admin';
      case UserRole.COLLEGE_ADMIN:
        return 'college_admin';
      case UserRole.TPO:
        return 'tpo';
      case UserRole.PLACEMENT_COORDINATOR:
        return 'placement_coordinator';
      case UserRole.INTERVIEWER:
        return 'interviewer';
      case UserRole.JOBSEEKER:
      default:
        return 'candidate';
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      return token.length > 0 ? token : null;
    }

    const cookieHeader = request.headers?.cookie as string | undefined;
    if (!cookieHeader) return null;

    const accessCookie = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('jc_access_token='));

    if (!accessCookie) return null;
    return decodeURIComponent(accessCookie.slice('jc_access_token='.length));
  }

  private getIp(request: any): string {
    return request.headers?.['x-forwarded-for'] || request.ip || 'unknown';
  }
}