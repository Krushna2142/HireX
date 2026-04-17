/**
 * Application Configuration
 * File: ts-api/src/config/configuration.ts
 *
 * Purpose: Centralized environment configuration for NestJS application
 * Integrates: Database, JWT, Redis, Gemini AI, WebRTC, SMTP
 *
 * Updated: Added WebRTC video conferencing and SMTP notification settings
 */

/* eslint-disable prettier/prettier */

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface WebRTCConfig {
  signalingNamespace: string;
  pingInterval: number;
  pingTimeout: number;
  maxParticipants: number;
  roomLinkExpiryMins: number;
  iceServers: ICEServer[];
  metricsEnabled: boolean;
  metricsIntervalMs: number;
  sfuEnabled: boolean;
  sfuProvider: 'mediasoup' | 'livekit' | 'none';
  livekitUrl?: string;
  livekitApiKey?: string;
  livekitApiSecret?: string;
}

interface SMTPConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // ════════════════════════════════════════════════════════════════════════════
  // JWT Configuration
  // ════════════════════════════════════════════════════════════════════════════
  jwt: {
    secret: process.env.JWT_SECRET ?? 'supersecretkey',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Supabase Configuration (Auth + Storage)
  // ════════════════════════════════════════════════════════════════════════════
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Gemini AI Configuration (Resume analysis, recommendations)
  // ════════════════════════════════════════════════════════════════════════════
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Redis Configuration (BullMQ job queue, caching)
  // Supports both URL format (Upstash/Railway) and host/port (self-hosted)
  // ════════════════════════════════════════════════════════════════════════════
  redis: {
    enabled:
      process.env.REDIS_ENABLED === 'true' ||
      !!process.env.REDIS_URL ||
      !!process.env.REDIS_HOST,
    url: process.env.REDIS_URL ?? null, // ← primary, used by BullMQ
    host: process.env.REDIS_HOST ?? null,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls: process.env.REDIS_TLS === 'true',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ✨ NEW: WebRTC Configuration (Video Conferencing for Interviews)
  // ════════════════════════════════════════════════════════════════════════════
  webrtc: (() => {
    // Parse TURN servers from environment (JSON array)
    let turnServers: ICEServer[] = [];
    try {
      const raw = process.env.TURN_SERVERS;
      if (raw && raw !== '[]' && raw !== '') {
        turnServers = JSON.parse(raw) as ICEServer[];
      }
    } catch (err) {
      console.warn('[Config] Failed to parse TURN_SERVERS:', err);
    }

    // Default STUN servers (free, Google-provided)
    const stunServers: ICEServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ];

    return {
      // Signaling server (Socket.IO)
      signalingNamespace: '/interview',
      pingInterval: parseInt(process.env.WEBRTC_PING_INTERVAL ?? '10000', 10),
      pingTimeout: parseInt(process.env.WEBRTC_PING_TIMEOUT ?? '5000', 10),

      // Room management
      maxParticipants: parseInt(
        process.env.INTERVIEW_ROOM_MAX_PARTICIPANTS ?? '6',
        10,
      ),
      // Room link expires 30min before and 2hrs after scheduled time
      roomLinkExpiryMins: parseInt(
        process.env.INTERVIEW_ROOM_LINK_EXPIRY_MINS ?? '120',
        10,
      ),

      // ICE servers for NAT traversal
      // STUN is free; TURN is paid/self-hosted for better connectivity
      iceServers: [...stunServers, ...turnServers],

      // Metrics collection for connection quality monitoring
      metricsEnabled: process.env.ENABLE_METRICS_COLLECTION !== 'false',
      metricsIntervalMs: parseInt(
        process.env.METRICS_COLLECTION_INTERVAL_MS ?? '2000',
        10,
      ),

      // SFU (Selective Forwarding Unit) fallback for large groups
      // Full-mesh for ≤6 participants; SFU for >6 participants
      sfuEnabled: process.env.SFU_ENABLED === 'true',
      sfuProvider:
        (process.env.SFU_PROVIDER as any) ?? 'none',
      livekitUrl: process.env.LIVEKIT_URL,
      livekitApiKey: process.env.LIVEKIT_API_KEY,
      livekitApiSecret: process.env.LIVEKIT_API_SECRET,
    } as WebRTCConfig;
  })(),

  // ════════════════════════════════════════════════════════════════════════════
  // ✨ NEW: SMTP Configuration (Email Notifications for Interviews)
  // ════════════════════════════════════════════════════════════════════════════
  smtp: (() => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    return {
      // Enable SMTP only if credentials are provided
      enabled: !!smtpUser && !!smtpPass,
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      user: smtpUser,
      pass: smtpPass,
      from: process.env.SMTP_FROM ?? 'noreply@job-crawler.com',
      fromName: process.env.SMTP_FROM_NAME ?? 'Job Crawler',
      replyTo: process.env.SMTP_REPLY_TO ?? 'support@job-crawler.com',
    } as SMTPConfig;
  })(),

  // ════════════════════════════════════════════════════════════════════════════
  // SerpAPI Configuration (Job scraping)
  // ════════════════════════════════════════════════════════════════════════════
  serpApiKey: process.env.SERPAPI_KEY ?? '',

  // ════════════════════════════════════════════════════════════════════════════
  // Database Configuration
  // ════════════════════════════════════════════════════════════════════════════
  database: {
    connectionString: process.env.DATABASE_URL ?? '',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Frontend URL (for CORS, OAuth redirects, email links)
  // ════════════════════════════════════════════════════════════════════════════
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});