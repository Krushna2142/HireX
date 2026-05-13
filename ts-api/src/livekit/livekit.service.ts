import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

export type BuildTokenArgs = {
  roomId: string;
  userId: string;
  userName?: string;
  role?: string;
  metadata?: Record<string, unknown>;
  ttl?: string;
};

@Injectable()
export class LivekitService {
  constructor(private readonly config: ConfigService) {}

  private getConfigValue(key: string): string | undefined {
    return this.config.get<string>(key) ?? process.env[key];
  }

  async buildRoomToken(args: BuildTokenArgs) {
    const apiKey = this.getConfigValue('LIVEKIT_API_KEY');
    const apiSecret = this.getConfigValue('LIVEKIT_API_SECRET');
    const livekitUrl = this.getConfigValue('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new InternalServerErrorException(
        'LiveKit is not configured. Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET',
      );
    }

    const ttl = args.ttl ?? '30m';

    const token = new AccessToken(apiKey, apiSecret, {
      identity: args.userId,
      name: args.userName ?? args.userId,
      ttl,
      metadata: JSON.stringify({
        role: args.role ?? 'participant',
        ...args.metadata,
      }),
    });

    token.addGrant({
      roomJoin: true,
      room: args.roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    return {
      token: await token.toJwt(),
      url: livekitUrl,
      roomId: args.roomId,
      expiresIn: ttl,
    };
  }
}