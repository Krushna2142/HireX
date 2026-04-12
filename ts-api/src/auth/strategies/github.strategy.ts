/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

type OAuthReq = Request & {
  query?: Record<string, string | undefined>;
};

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: OAuthReq,
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (...args: any[]) => void,
  ): Promise<void> {
    const primaryEmail =
      profile?.emails?.find((e: any) => e?.primary)?.value ||
      profile?.emails?.[0]?.value;

    if (!primaryEmail) {
      return done(
        new UnauthorizedException(
          'GitHub email not available. Make sure your email is verified/public.',
        ),
        false,
      );
    }

    const requestedRole =
      req?.query?.role === 'recruiter' ? 'recruiter' : 'candidate';

    const mode =
      req?.query?.mode === 'signup' ? 'signup' : 'signin';

    return done(null, {
      email: String(primaryEmail).toLowerCase(),
      fullName: profile?.displayName || profile?.username || 'GitHub User',
      provider: 'github',
      providerId: profile?.id,
      requestedRole,
      mode,
    });
  }
}