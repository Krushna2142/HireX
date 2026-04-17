import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

type BuildTokenArgs = {
  roomId: string;
  userId: string;
  userName?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class LivekitService {
  constructor(private readonly config: ConfigService) {}

  buildRoomToken(args: BuildTokenArgs) {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new InternalServerErrorException(
        'LiveKit is not configured. Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET',
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: args.userId,
      name: args.userName ?? args.userId,
      ttl: '15m',
      metadata: JSON.stringify({
        role: args.role ?? 'participant',
        ...args.metadata,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room: args.roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      token: at.toJwt(),
      url: livekitUrl,
      roomId: args.roomId,
    };
  }
}