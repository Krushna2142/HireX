/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

// ── Change handler type ───────────────────────────────────────────────────────

type ChangeHandler<T = any> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new:       T;
  old:       T;
}) => void;

// ── Subscribe to alerts for a specific user ───────────────────────────────────

export function subscribeToAlerts(
  userId:  string,
  onAlert: ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(`alerts:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'alerts',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => onAlert({
        eventType: 'INSERT',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Subscribe to application status changes for a candidate ──────────────────

export function subscribeToApplications(
  candidateId: string,
  onUpdate:    ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(`applications:candidate:${candidateId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'applications',
        filter: `candidate_id=eq.${candidateId}`,
      },
      (payload: any) => onUpdate({
        eventType: 'UPDATE',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Subscribe to new applicants for a specific job ────────────────────────────

export function subscribeToJobApplicants(
  jobId:          string,
  onNewApplicant: ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel(`applications:job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'applications',
        filter: `job_id=eq.${jobId}`,
      },
      (payload: any) => onNewApplicant({
        eventType: 'INSERT',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Subscribe to new job postings (candidate job feed) ────────────────────────

export function subscribeToNewJobs(
  onNewJob: ChangeHandler,
): RealtimeChannel {
  return supabase
    .channel('jobs:feed')
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'jobs',
      },
      (payload: any) => onNewJob({
        eventType: 'INSERT',
        new:       payload.new,
        old:       payload.old ?? {},
      }),
    )
    .subscribe();
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}