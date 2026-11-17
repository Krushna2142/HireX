/**
 * Socket.IO client for the interview room signaling namespace ("/interview").
 *
 * Fixes vs. the old room code:
 *  - old code opened a raw `WebSocket` to `${WS_URL}/interview-room/:id`, but the API only
 *    speaks Socket.IO on the `/interview` namespace -> signaling never connected.
 *  - old `useSocket` read the token from `localStorage['auth_token']`; the app stores it
 *    as `jc_token`. The token is also resolved lazily here, so every (re)connect uses the
 *    freshest access token (they only live 15 minutes).
 */
import { io, type Socket } from 'socket.io-client';
import { getToken } from '@/lib/auth';

/** http(s) origin of the API server (no /api suffix, no namespace). */
export function getRealtimeBaseUrl(): string {
  const ws = process.env.NEXT_PUBLIC_WS_URL;
  if (ws) {
    // ws:// -> http://, wss:// -> https://; http(s) values are left untouched
    return ws.replace(/^ws/i, 'http').replace(/\/+$/, '');
  }
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (api) return api.replace(/\/+$/, '').replace(/\/api$/, '');
  return 'http://localhost:3001';
}

export function createInterviewSocket(): Socket {
  return io(`${getRealtimeBaseUrl()}/interview`, {
    autoConnect: false,
    // polling fallback keeps strict corporate proxies working
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 10_000,
    // function form => evaluated on every connection attempt
    auth: (cb) => cb({ token: getToken() ?? '' }),
  });
}

/** emit with an ack and a timeout, as a promise. */
export function emitAck<T = { ok: boolean; [k: string]: unknown }>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 8_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, res: T) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}