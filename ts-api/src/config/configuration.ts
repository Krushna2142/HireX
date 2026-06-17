/* eslint-disable prettier/prettier */
// ts-api/src/config/configuration.ts

import './load-env';

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
  sfuProvider: 'mediasoup' | 'none';
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

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolEnv(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;

  return ['true', '1', 'yes', 'on'].includes(raw.toLowerCase());
}

function strEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function parseIceServersFromJson(raw?: string): ICEServer[] {
  if (!raw || raw.trim() === '' || raw.trim() === '[]') return [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((server) => server && typeof server === 'object')
      .map((server) => ({
        urls: server.urls,
        username: server.username,
        credential: server.credential,
      }))
      .filter((server) => Boolean(server.urls));
  } catch (err) {
    console.warn('[Config] Failed to parse TURN/STUN JSON:', err);
    return [];
  }
}

function buildIceServers(): ICEServer[] {
  const defaultStunServers: ICEServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  const stunFromJson = parseIceServersFromJson(
    process.env.STUN_SERVERS ?? process.env.NEXT_PUBLIC_STUN_SERVERS,
  );

  const turnFromJson = parseIceServersFromJson(
    process.env.TURN_SERVERS ?? process.env.NEXT_PUBLIC_TURN_SERVERS,
  );

  const singleTurnUrl = process.env.TURN_SERVER_URL;
  const singleTurnUsername = process.env.TURN_USERNAME;
  const singleTurnPassword = process.env.TURN_PASSWORD;

  const singleTurnServer: ICEServer[] =
    singleTurnUrl && singleTurnUsername && singleTurnPassword
      ? [
          {
            urls: singleTurnUrl,
            username: singleTurnUsername,
            credential: singleTurnPassword,
          },
        ]
      : [];

  const singleStunUrl = process.env.STUN_SERVER_URL;

  const singleStunServer: ICEServer[] = singleStunUrl
    ? [{ urls: singleStunUrl }]
    : [];

  const finalServers = [
    ...defaultStunServers,
    ...singleStunServer,
    ...stunFromJson,
    ...singleTurnServer,
    ...turnFromJson,
  ];

  const seen = new Set<string>();

  return finalServers.filter((server) => {
    const key = JSON.stringify(server);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default () => ({
  port: intEnv('PORT', 3001),
  nodeEnv: strEnv('NODE_ENV', 'development'),

  jwt: {
    secret: strEnv('JWT_SECRET', 'supersecretkey'),
    expiresIn: strEnv('JWT_EXPIRES_IN', '7d'),
    accessSecret: strEnv(
      'JWT_ACCESS_SECRET',
      strEnv('JWT_SECRET', 'supersecretkey'),
    ),
    refreshSecret: strEnv(
      'JWT_REFRESH_SECRET',
      strEnv('JWT_SECRET', 'supersecretkey'),
    ),
    accessExpiresIn: strEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: strEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  supabase: {
    url: strEnv('SUPABASE_URL'),
    anonKey: strEnv('SUPABASE_ANON_KEY'),
    serviceRoleKey: strEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },

  // Gemini is optional now.
  // Backend must not crash if GEMINI_API_KEY is missing.
  gemini: {
    enabled: boolEnv('ENABLE_GEMINI_AI', Boolean(process.env.GEMINI_API_KEY)),
    apiKey: strEnv('GEMINI_API_KEY'),
    model: strEnv('GEMINI_MODEL', 'gemini-1.5-flash'),
  },

  redis: {
    enabled:
      boolEnv('REDIS_ENABLED', false) ||
      Boolean(process.env.REDIS_URL) ||
      Boolean(process.env.REDIS_HOST) ||
      process.env.NODE_ENV !== 'production',
    url: strEnv('REDIS_URL', 'redis://localhost:6379'),
    host: process.env.REDIS_HOST ?? null,
    port: intEnv('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
    tls: boolEnv('REDIS_TLS', false),
  },

  webrtc: (() => {
    return {
      signalingNamespace: '/interview',
      pingInterval: intEnv('WEBRTC_PING_INTERVAL', 10000),
      pingTimeout: intEnv('WEBRTC_PING_TIMEOUT', 5000),

      maxParticipants: intEnv('INTERVIEW_ROOM_MAX_PARTICIPANTS', 6),
      roomLinkExpiryMins: intEnv('INTERVIEW_ROOM_LINK_EXPIRY_MINS', 120),

      iceServers: buildIceServers(),

      metricsEnabled: process.env.ENABLE_METRICS_COLLECTION !== 'false',
      metricsIntervalMs: intEnv('METRICS_COLLECTION_INTERVAL_MS', 2000),

      // No LiveKit. Custom WebRTC only.
      sfuEnabled: false,
      sfuProvider: 'none',
    } as WebRTCConfig;
  })(),

  smtp: (() => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    return {
      enabled: Boolean(smtpUser && smtpPass),
      host: strEnv('SMTP_HOST', 'smtp.gmail.com'),
      port: intEnv('SMTP_PORT', 587),
      user: smtpUser,
      pass: smtpPass,
      from: strEnv('SMTP_FROM', 'noreply@hirex.ai'),
      fromName: strEnv('SMTP_FROM_NAME', 'HireX'),
      replyTo: strEnv('SMTP_REPLY_TO', 'support@hirex.ai'),
    } as SMTPConfig;
  })(),

  serpApiKey: strEnv('SERPAPI_KEY'),
  rapidApiKey: strEnv('RAPIDAPI_KEY'),

  database: {
    connectionString: strEnv('DATABASE_URL'),
  },

  python: {
    apiUrl: strEnv('PYTHON_API_URL'),
    apiKey: strEnv('PYTHON_API_KEY'),
    atsEnabled: boolEnv('ENABLE_PYTHON_ATS', Boolean(process.env.PYTHON_API_URL)),
  },

  frontendUrl: strEnv('FRONTEND_URL', 'http://localhost:3000'),
});