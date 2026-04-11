// hooks/useResumePolling.ts
// ─────────────────────────────────────────────────────────────────────────────
// SWR-backed resume polling hooks consumed by ResumeAnalysisTab.tsx.
// Key behaviours:
//   • useResumes  — polls every 8s, always reflects latest upload/status
//   • useAnalysis — polls the individual resume record at 5s while processing,
//                   slows to 30s once terminal, then auto-fetches the analysis
//                   result and invalidates /jobs/recommendations so the
//                   Recommendations tab populates immediately after analysis.
// ─────────────────────────────────────────────────────────────────────────────

import useSWR, { mutate as globalMutate } from 'swr';
import { useState, useCallback, useRef } from 'react';
import api from '@/lib/axios';

// ── Shared fetcher ────────────────────────────────────────────────────────────

const fetcher = (url: string) => api.get(url).then(r => r.data);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

export interface Resume {
  id:        string;
  fileName:  string;
  rawFile:   string;
  status:    ResumeStatus;
  createdAt: string;
}

export interface ResumeAnalysis {
  id:              string;
  resumeId:        string;
  rawText?:        string;
  experienceYears: number;
  experienceLevel: string;
  topSkills:       string[];
  industryTags:    string[];
  trajectory?:     string;
  status:          string;
  processedAt?:    string | null;
}

// ── useResumes ────────────────────────────────────────────────────────────────
// Returns the authenticated user's resume list, refreshed every 8s.
// After uploading a new resume the caller invokes reload() to get it
// immediately without waiting for the next poll tick.

export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[]>(
    '/resumes',
    fetcher,
    {
      // ✅ Disabled: automatic polling removed 
      // ✅ Only fetch on focus/reconnect or manual reload
      refreshInterval:       false,
      revalidateOnFocus:     true,
      revalidateOnReconnect: true,
      dedupingInterval:      3_000,
    },
  );

  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    resumes: data ?? [],
    loading: isLoading,
    error:   error?.response?.data?.message ?? error?.message ?? null,
    reload,
  };
}

// ── useAnalysis ───────────────────────────────────────────────────────────────
// Tracks one resume's analysis lifecycle:
//   uploaded   → user triggers → processing (5s poll) → analyzed (30s poll)
//   analyzed   → auto-fetches ResumeAnalysis record
//   analyzed   → cross-invalidates /jobs/recommendations so recs appear live
//
// The `didInvalidate` ref prevents redundant invalidation calls when SWR
// re-renders after the recommendations key is already fresh.

export function useAnalysis(resumeId: string | null) {
  const [triggering,    setTriggering]    = useState(false);
  const [triggerError,  setTriggerError]  = useState<string | null>(null);
  const didInvalidate = useRef(false);

  // ── Poll the resume status record ─────────────────────────────────────────

  const { data: resume, mutate: mutateResume } = useSWR<Resume>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher,
    {
      // ✅ Disabled: removed automatic polling (5s/30s intervals)
      // ✅ Only fetch on focus/reconnect or manual revalidation
      refreshInterval: false,
      revalidateOnFocus: true,
      onSuccess: (data: Resume) => {
        // When analysis finishes, invalidate recommendations once
        if (data.status === 'analyzed' && !didInvalidate.current) {
          didInvalidate.current = true;
          void globalMutate('/jobs/recommendations');
          void globalMutate('/resumes');
          void globalMutate('/resumes/latest');
        }
        // Reset flag if resume goes back to a non-analyzed state (re-upload)
        if (data.status !== 'analyzed') {
          didInvalidate.current = false;
        }
      },
    },
  );

  // ── Fetch the analysis result once status === 'analyzed' ──────────────────

  const { data: analysis, mutate: mutateAnalysis } = useSWR<ResumeAnalysis>(
    resume?.status === 'analyzed' && resumeId
      ? `/resumes/${resumeId}/analysis`
      : null,
    fetcher,
    {
      // Only re-fetch analysis on focus if it somehow went stale
      revalidateOnFocus: false,
      dedupingInterval:  10_000,
    },
  );

  // ── Trigger analysis ──────────────────────────────────────────────────────
  // POST /resumes/:id/analyse → backend enqueues BullMQ job → status flips
  // to 'processing'. We immediately revalidate the status poll so the spinner
  // appears in the UI without waiting for the next 8s tick.

  const triggerAnalysis = useCallback(async (id: string) => {
    setTriggering(true);
    setTriggerError(null);
    didInvalidate.current = false; // reset so cross-invalidation fires again

    try {
      await api.post(`/resumes/${id}/analyse`);

      // Force-revalidate status immediately so UI shows 'processing' at once
      await Promise.all([
        mutateResume(),
        mutateAnalysis(undefined), // clear stale analysis from previous run
        globalMutate('/resumes'),
      ]);

      // ✅ Poll manually every 2 seconds until analysis completes (max 5 minutes)
      const pollInterval = setInterval(async () => {
        try {
          const latestResume = await api.get(`/resumes/${id}`);
          if (latestResume.data?.status === 'analyzed') {
            clearInterval(pollInterval);
            // Analysis complete - fetch analysis and recommendations
            await Promise.all([
              mutateResume(),
              globalMutate(`/resumes/${id}/analysis`),
              globalMutate('/jobs/recommendations'),
            ]);
          } else if (latestResume.data?.status === 'failed') {
            clearInterval(pollInterval);
            setTriggerError('Analysis failed. Please try again.');
            await mutateResume();
          }
        } catch (err) {
          // Silently fail on poll errors, will retry next interval
        }
      }, 2000);

      // Clear polling after 5 minutes to prevent memory leaks
      setTimeout(() => clearInterval(pollInterval), 300_000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })
              ?.response?.data?.message ?? 'Failed to start analysis';
      setTriggerError(message);
    } finally {
      setTriggering(false);
    }
  }, [mutateResume, mutateAnalysis]);

  return {
    analysis,
    status:          resume?.status ?? null,
    loading:         triggering,
    error:           triggerError,
    triggerAnalysis,
  };
}
