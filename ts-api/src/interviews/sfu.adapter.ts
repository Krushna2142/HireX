/**
 * SFU Adapter (pluggable)
 *
 * This file contains a small adapter interface and a lightweight skeleton
 * for integrating an SFU such as mediasoup or LiveKit. For production use
 * prefer a separate dedicated SFU service (K8s Deployment) and use the
 * adapter here to control rooms, create transports, and manage producers.
 */

import { Logger } from '@nestjs/common';

export type SFUProvider = 'mediasoup' | 'livekit' | 'janus' | 'none';

export interface SFURoomOptions {
  roomId: string;
  maxParticipants?: number;
  metadata?: Record<string, unknown>;
}

export interface SFUAdapter {
  provider: SFUProvider;
  ensureRoom(opts: SFURoomOptions): Promise<void>;
  createTransport(roomId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  closeRoom(roomId: string): Promise<void>;
}

export class NoopSFUAdapter implements SFUAdapter {
  provider: SFUProvider = 'none';
  private readonly logger = new Logger(NoopSFUAdapter.name);

  async ensureRoom(opts: SFURoomOptions): Promise<void> {
    this.logger.debug(`NoopSFUAdapter.ensureRoom ${opts.roomId}`);
    return;
  }

  async createTransport(roomId: string): Promise<Record<string, unknown>> {
    this.logger.debug(`NoopSFUAdapter.createTransport ${roomId}`);
    // P2P fallback — client will create plain RTCPeerConnection
    return { type: 'p2p-fallback' };
  }

  async closeRoom(roomId: string): Promise<void> {
    this.logger.debug(`NoopSFUAdapter.closeRoom ${roomId}`);
    return;
  }
}

// Export a simple factory used by the InterviewGateway to pick an adapter based
// on configuration or env. For a production deployment integrate a real SFU
// and implement an adapter that handles room lifecycle, create transports,
// and issues tokens for clients as needed.
export function createSFUAdapter(provider: SFUProvider): SFUAdapter {
  switch (provider) {
    case 'mediasoup':
    case 'livekit':
    case 'janus':
      // TODO: implement adapters for each SFU
      return new NoopSFUAdapter();
    default:
      return new NoopSFUAdapter();
  }
}
