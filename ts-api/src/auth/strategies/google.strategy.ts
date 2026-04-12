/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

type OAuthReq = Request & {
  query?: Record<string, string | undefined>;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
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
    const email = profile?.emails?.[0]?.value?.toLowerCase();
    if (!email) {
      return done(new UnauthorizedException('Google account email not available'), false);
    }

    const fullName =
      profile?.displayName ||
      `${profile?.name?.givenName ?? ''} ${profile?.name?.familyName ?? ''}`.trim() ||
      email.split('@')[0];

    const requestedRole =
      req?.query?.role === 'recruiter' ? 'recruiter' : 'candidate';

    const mode =
      req?.query?.mode === 'signup' ? 'signup' : 'signin';

    return done(null, {
      email,
      fullName,
      provider: 'google',
      providerId: profile?.id,
      requestedRole,
      mode,
    });
  }
}