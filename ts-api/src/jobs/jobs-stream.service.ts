/* eslint-disable prettier/prettier */
// src/jobs/jobs-stream.service.ts

import { Injectable } from '@nestjs/common';
import { Subject }    from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// Typed payloads for each event type
// Each interface has [key: string]: unknown — satisfies Record<string, unknown>
// while still giving callers full type safety on known fields.
// ─────────────────────────────────────────────────────────────────────────────

export interface JobCreatedPayload {
  id:      string;
  title:   string;
  company: string;
  [key: string]: unknown;   // ✅ satisfies Record<string, unknown>
}

export interface SyncedPayload {
  synced:    number;
  newJobs:   number;
  platforms: string[];
  [key: string]: unknown;   // ✅ fixes ts(2322) — index signature was missing
}

export interface AlertPayload {
  type:      string;
  message:   string;
  count?:    number;
  platforms?: string[];
  [key: string]: unknown;   // ✅ satisfies Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated union — each event type maps to its own payload shape.
// TypeScript can now narrow the payload type based on the event type.
// ─────────────────────────────────────────────────────────────────────────────

export type JobStreamEvent =
  | { type: 'job_created'; payload: JobCreatedPayload }
  | { type: 'jobs_synced'; payload: SyncedPayload     }
  | { type: 'alert';       payload: AlertPayload      };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class JobsStreamService {
  private readonly events$ = new Subject<JobStreamEvent>();

  get stream() {
    return this.events$.asObservable();
  }

  emitJobCreated(job: JobCreatedPayload): void {
    this.events$.next({ type: 'job_created', payload: job });
  }

  // ✅ ts(2322) fully resolved — SyncedPayload now has index signature
  emitJobsSynced(stats: SyncedPayload): void {
    this.events$.next({ type: 'jobs_synced', payload: stats });
  }

  emitAlert(alert: AlertPayload): void {
    this.events$.next({ type: 'alert', payload: alert });
  }
}
