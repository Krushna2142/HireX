/* eslint-disable react-hooks/immutability */
// frontend/hooks/useResumeAnalysis.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getLatestResume,
  triggerAnalysis,
  getResume,
  Resume,
  ResumeStatus,
} from '@/lib/resumes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnalysisState =
  | 'idle'        // no resume uploaded yet
  | 'uploaded'    // resume uploaded, analysis not started
  | 'triggering'  // POST /resumes/:id/analyse in flight
  | 'processing'  // BullMQ job running — polling active
  | 'analyzed'    // complete
  | 'failed';     // error

interface UseResumeAnalysisReturn {
  resume:        Resume | null;
  analysisState: AnalysisState;
  error:         string | null;
  canAnalyse:    boolean;
  trigger:       () => Promise<void>;
  refresh:       () => Promise<void>;
}

// ── Status → AnalysisState map ────────────────────────────────────────────────

const STATUS_STATE_MAP: Record<ResumeStatus, AnalysisState> = {
  uploaded:   'uploaded',
  processing: 'processing',
  analyzed:   'analyzed',
  failed:     'failed',
};

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS     = 40;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useResumeAnalysis(): UseResumeAnalysisReturn {
  const [resume,        setResume]        = useState<Resume | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [error,         setError]         = useState<string | null>(null);

  // Use a ref to track polling so we can cancel it on unmount
  // and avoid stale closure issues between useCallback dependencies.
  const pollingRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef  = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // ── Polling loop ──────────────────────────────────────────────────────────
  // Defined with useRef pattern to avoid stale closure deps and
  // circular useCallback references.

  const pollOnce = useCallback(async (resumeId: string) => {
    if (!isMountedRef.current) return;

    attemptsRef.current += 1;

    try {
      const updated = await getResume(resumeId);

      if (!isMountedRef.current) return;

      setResume(updated);

      if (updated.status === 'analyzed') {
        setAnalysisState('analyzed');
        return;
      }

      if (updated.status === 'failed') {
        setAnalysisState('failed');
        setError('Analysis failed. Please try again.');
        return;
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setAnalysisState('failed');
        setError('Analysis is taking longer than expected. Try again later.');
        return;
      }

      // Still processing — schedule next poll
      setAnalysisState('processing');
      pollingRef.current = setTimeout(() => {
        void pollOnce(resumeId);
      }, POLL_INTERVAL_MS);

    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Polling failed';
      setError(message);
      setAnalysisState('failed');
    }
  }, []); // no deps — uses refs to avoid stale closures

  const startPolling = useCallback((resumeId: string) => {
    // Cancel any existing poll before starting a new one
    if (pollingRef.current) clearTimeout(pollingRef.current);
    attemptsRef.current = 0;
    setAnalysisState('processing');
    void pollOnce(resumeId);
  }, [pollOnce]);

  // ── Load latest resume on mount ───────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const latest = await getLatestResume();

      if (!isMountedRef.current) return;

      setResume(latest);

      if (!latest) {
        setAnalysisState('idle');
        return;
      }

      const nextState = STATUS_STATE_MAP[latest.status] ?? 'idle';
      setAnalysisState(nextState);

      // Resume polling if analysis was already in progress
      // (e.g. user refreshed the page mid-analysis)
      if (latest.status === 'processing') {
        startPolling(latest.id);
      }

    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load resume';
      setError(message);
    }
  }, [startPolling]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Trigger analysis ──────────────────────────────────────────────────────

  const trigger = useCallback(async () => {
    // ✅ Guard: resume.id is guaranteed non-null here via canAnalyse check
    if (!resume?.id) return;

    setError(null);
    setAnalysisState('triggering');

    try {
      await triggerAnalysis(resume.id);  // ✅ resume.id: string (not null)
      startPolling(resume.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start analysis';
      setError(message);
      setAnalysisState('failed');
    }
  }, [resume?.id, startPolling]);

  const canAnalyse = analysisState === 'uploaded' || analysisState === 'failed';

  return {
    resume,
    analysisState,
    error,
    canAnalyse,
    trigger,
    refresh,
  };
}