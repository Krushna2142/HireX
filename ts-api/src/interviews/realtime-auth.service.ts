/* eslint-disable prettier/prettier */
/**
 * RealtimeAuthService
 *
 * Authenticates a raw access token for WebSocket (Socket.IO) connections using
 * the same rules as JwtAuthGuard (REST):
 *   - HireX access tokens: signed with jwt.accessSecret ?? jwt.secret, must have a
 *     live, non-revoked auth session and an active user.
 *   - Supabase (Google) tokens: resolved to the canonical HireX user.
 *
 * Why this exists: the old gateway verified tokens with JwtService (jwt.secret only,
 * no session check, no Supabase support), so users who logged in with Google, or whose
 * access/refresh secrets differ, were silently disconnected from the room.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthProvider, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getSupabaseServiceClient } from '../lib/supabase';

export type RealtimeRole =
  | 'candidate' | 'recruiter' | 'admin' | 'super_admin'
  | 'college_admin' | 'tpo' | 'placement_coordinator' | 'interviewer';

export type RealtimeUser = {
  id: string;
  email: string;
  role: RealtimeRole;
  fullName: string;
};

@Injectable()
export class RealtimeAuthService {
  private readonly secret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      this.config.get<string>('jwt.accessSecret') ??
      this.config.get<string>('jwt.secret');
    if (!secret) throw new Error('JWT secret is not configured');
    this.secret = secret;
  }

  async authenticate(token: string): Promise<RealtimeUser> {
    const decoded = jwt.decode(token) as Record<string, unknown> | null;
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Malformed token');
    }
    if (decoded.aud === 'authenticated' && !decoded.sid) {
      return this.authenticateSupabase(token);
    }
    return this.authenticateOwn(token);
  }

  private async authenticateOwn(token: string): Promise<RealtimeUser> {
    const payload = jwt.verify(token, this.secret) as {
      sub?: string;
      sid?: string;
    };
    if (!payload.sub || !payload.sid) throw new Error('Incomplete token');

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
      throw new Error('Session expired');
    }
    const u = session.user;
    if (!u.isActive || u.isBlocked || u.deletedAt) {
      throw new Error('Account is not active');
    }
    return this.toUser(u);
  }

  private async authenticateSupabase(token: string): Promise<RealtimeUser> {
    const { data, error } = await getSupabaseServiceClient().auth.getUser(token);
    const sb = data?.user;
    if (error || !sb) throw new Error('Invalid Supabase token');

    let user = (
      await this.prisma.authAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: AuthProvider.GOOGLE,
            providerAccountId: sb.id,
          },
        },
        include: { user: true },
      })
    )?.user;

    if (!user) {
      const email = sb.email?.trim().toLowerCase();
      if (!email || !sb.email_confirmed_at) {
        throw new Error('Verified email required');
      }
      user =
        (await this.prisma.user.findUnique({ where: { email } })) ?? undefined;
    }
    if (!user) throw new Error('User not found');
    if (!user.isActive || user.isBlocked || user.deletedAt) {
      throw new Error('Account is not active');
    }
    return this.toUser(user);
  }

  private toUser(u: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string | null;
  }): RealtimeUser {
    let role: RealtimeRole;
    switch (u.role) {
      case UserRole.RECRUITER:
        role = 'recruiter';
        break;
      case UserRole.ADMIN:
        role = 'admin';
        break;
      case UserRole.SUPER_ADMIN:
        role = 'super_admin';
        break;
              case UserRole.COLLEGE_ADMIN:
        role = 'college_admin';
        break;
      case UserRole.TPO:
        role = 'tpo';
        break;
      case UserRole.PLACEMENT_COORDINATOR:
        role = 'placement_coordinator';
        break;
      case UserRole.INTERVIEWER:
        role = 'interviewer';
        break;
      default:
        role = 'candidate';
    }
    return {
      id: u.id,
      email: u.email,
      role,
      fullName: u.fullName?.trim() || u.email.split('@')[0],
    };
  }
}