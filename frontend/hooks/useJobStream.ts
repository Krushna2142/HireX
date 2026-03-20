// frontend/hooks/useJobStream.ts
//
// Connects to the NestJS SSE endpoint once per session.
// When server emits events, triggers SWR revalidation — zero polling.
// EventSource auto-reconnects on disconnect natively.

'use client';

import { useEffect, useRef } from 'react';
import { mutate }            from 'swr';

// Strip /api suffix — SSE endpoint is on the base backend URL
const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
    .replace(/\/api$/, '');

export function useJobStream() {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect if already connected
    if (esRef.current) return;

    const url = `${BACKEND_BASE}/api/jobs/stream`;
    const es  = new EventSource(url);
    esRef.current = es;

    // ── Event: recruiter posted a new job ─────────────────────────────────
    es.addEventListener('job_created', () => {
      // Revalidate all /jobs SWR keys — new job appears instantly
      void mutate((key: unknown) =>
        typeof key === 'string' && key.startsWith('/jobs')
      );
    });

    // ── Event: sync batch completed (SERP + LinkedIn + Indeed) ───────────
    es.addEventListener('jobs_synced', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as {
          payload: { newJobs: number; platforms: string[] };
        };
        // Only revalidate if genuinely new jobs arrived — avoid noise
        if ((event.payload?.newJobs ?? 0) > 0) {
          void mutate((key: unknown) =>
            typeof key === 'string' &&
            (key.startsWith('/jobs') || key === '/alerts')
          );
        }
      } catch {
        // Malformed event — safe to ignore
      }
    });

    // ── Event: new alert created ──────────────────────────────────────────
    es.addEventListener('alert', () => {
      // Revalidate alerts so badge count updates without polling
      void mutate('/alerts');
    });

    es.onerror = () => {
      // EventSource handles reconnect automatically
      // No manual retry needed — browser will reconnect after ~3s
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);
}
