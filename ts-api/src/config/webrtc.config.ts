/**
 * WebRTC Configuration Service
 * File: ts-api/src/config/webrtc.config.ts
 *
 * Purpose: Centralized WebRTC configuration following your project's setup pattern
 * Integrates with:
 * - src/config/configuration.ts (main config)
 * - src/app.module.ts (ConfigModule)
 * - .env variables
 *
 * Usage: Inject ConfigService and access via config.get('webrtc.*')
 */

import { registerAs } from '@nestjs/config';

export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  // Signaling server
  signalingNamespace: string;
  pingInterval: number;
  pingTimeout: number;

  // Room settings
  maxParticipants: number;
  roomLinkExpiryMins: number;

  // ICE servers (STUN/TURN)
  iceServers: ICEServer[];

  // Metrics collection
  metricsEnabled: boolean;
  metricsIntervalMs: number;

  // SFU fallback (for large groups)
  sfuEnabled: boolean;
  sfuProvider: 'mediasoup' | 'livekit' | 'none';
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}

export default registerAs('webrtc', (): WebRTCConfig => {
  // Parse TURN servers from environment
  let turnServers: ICEServer[] = [];
  try {
    const raw = process.env.TURN_SERVERS;
    if (raw && raw !== '[]') {
      turnServers = JSON.parse(raw) as ICEServer[];
    }
  } catch (err) {
    console.warn('[WebRTC Config] Failed to parse TURN_SERVERS:', err);
  }

  // Default STUN servers (free, Google-provided)
  const stunServers: ICEServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Combine: STUN first (free), then TURN (paid/self-hosted for NAT traversal)
  const iceServers = [...stunServers, ...turnServers];

  return {
    // ── Signaling ────────────────────────────────────────────────────────────
    signalingNamespace: '/interview',
    pingInterval: parseInt(process.env.WEBRTC_PING_INTERVAL || '10000', 10),
    pingTimeout: parseInt(process.env.WEBRTC_PING_TIMEOUT || '5000', 10),

    // ── Room Management ──────────────────────────────────────────────────────
    maxParticipants: parseInt(process.env.INTERVIEW_ROOM_MAX_PARTICIPANTS || '6', 10),
    roomLinkExpiryMins: parseInt(process.env.INTERVIEW_ROOM_LINK_EXPIRY_MINS || '120', 10),

    // ── ICE Servers ──────────────────────────────────────────────────────────
    // Clients use these to establish NAT traversal
    // TURN servers are required for production across different networks
    iceServers,

    // ── Metrics ──────────────────────────────────────────────────────────────
    metricsEnabled: process.env.ENABLE_METRICS_COLLECTION !== 'false',
    metricsIntervalMs: parseInt(process.env.METRICS_COLLECTION_INTERVAL_MS || '2000', 10),

    // ── SFU Fallback (for large groups) ──────────────────────────────────────
    // Use full-mesh WebRTC for ≤6 participants (direct peer connections)
    // Switch to SFU (Selective Forwarding Unit) for larger groups
    sfuEnabled: process.env.SFU_ENABLED === 'true',
    sfuProvider: (process.env.SFU_PROVIDER || 'none') as 'mediasoup' | 'livekit' | 'none',
    livekitUrl: process.env.LIVEKIT_URL,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  };
});