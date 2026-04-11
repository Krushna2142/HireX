// hooks/useResumePolling.ts
// ─────────────────────────────────────────────────────────────────────────────
// SWR-backed resume polling hooks consumed by ResumeAnalysisTab.tsx.
// Key behaviours:
//   • useResumes  — fetches latest resume list (manual + focus/reconnect refresh)
//   • useAnalysis — tracks a single resume record and fetches analysis when ready
// ─────────────────────────────��───────────────────────────────────────────────

import useSWR, { mutate as globalMutate, type Fetcher } from 'swr';
import { useState, useCallback, useRef } from 'react';
import api from '@/lib/axios';

// ── Shared fetcher ────────────────────────────────────────────────────────────
const fetcher: Fetcher<unknown, string> = (url) => api.get(url).then((r) => r.data);

// ── Types ────────��────────────────────────────────────────────────────────────
export type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

export interface Resume {
  id: string;
  fileName: string;
  rawFile: string;
  status: ResumeStatus;
  createdAt: string;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  rawText?: string;
  experienceYears: number;
  experienceLevel: string;
  topSkills: string[];
  industryTags: string[];
  trajectory?: string;
  status: string;
  processedAt?: string | null;
}

// ── useResumes ────────────────────────────────────────────────────────────────
// Returns the authenticated user's resume list.
// After uploading a new resume, caller invokes reload() for immediate refresh.
export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[], Error>(
    '/resumes',
    fetcher as Fetcher<Resume[], string>,
    {
      // Disabled interval polling; use focus/reconnect/manual reload
      refreshInterval: 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 3_000,
    },
  );

  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    resumes: data ?? [],
    loading: isLoading,
    error:
      (error as any)?.response?.data?.message ??
      (error as Error | undefined)?.message ??
      null,
    reload,
  };
}

// ── useAnalysis ───────────────────────────────────────────────────────────────
// Tracks one resume's analysis lifecycle and invalidates related caches.
export function useAnalysis(resumeId: string | null) {
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const didInvalidate = useRef(false);

  // Poll/fetch the resume status record (manual/focus-based refresh)
  const { data: resume, mutate: mutateResume } = useSWR<Resume, Error>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher as Fetcher<Resume, string>,
    {
      refreshInterval: 0, // <- was false
      revalidateOnFocus: true,
      onSuccess: (data: Resume) => {
        // When analysis finishes, invalidate recommendations once
        if (data.status === 'analyzed' && !didInvalidate.current) {
          didInvalidate.current = true;
          void globalMutate('/jobs/recommendations');
          void globalMutate('/resumes');
          void globalMutate('/resumes/latest');
        }

        // Reset flag if resume goes back to a non-analyzed state
        if (data.status !== 'analyzed') {
          didInvalidate.current = false;
        }
      },
    },
  );

  // Fetch analysis only when resume is analyzed
  const { data: analysis, mutate: mutateAnalysis } = useSWR<ResumeAnalysis, Error>(
    resume?.status === 'analyzed' && resumeId ? `/resumes/${resumeId}/analysis` : null,
    fetcher as Fetcher<ResumeAnalysis, string>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  // Trigger analysis
  const triggerAnalysis = useCallback(
    async (id: string) => {
      setTriggering(true);
      setTriggerError(null);
      didInvalidate.current = false;

      try {
        await api.post(`/resumes/${id}/analyse`);

        // Revalidate immediately so UI reflects processing state quickly
        await Promise.all([
          mutateResume(),
          mutateAnalysis(undefined),
          globalMutate('/resumes'),
        ]);

        // Poll manually every 2s until terminal (max 5 minutes)
        const pollInterval = setInterval(async () => {
          try {
            const latestResume = await api.get(`/resumes/${id}`);
            const latestStatus = latestResume.data?.status as ResumeStatus | undefined;

            if (latestStatus === 'analyzed') {
              clearInterval(pollInterval);
              await Promise.all([
                mutateResume(),
                globalMutate(`/resumes/${id}/analysis`),
                globalMutate('/jobs/recommendations'),
              ]);
            } else if (latestStatus === 'failed') {
              clearInterval(pollInterval);
              setTriggerError('Analysis failed. Please try again.');
              await mutateResume();
            }
          } catch {
            // Ignore transient polling errors; next interval retries
          }
        }, 2_000);

        setTimeout(() => clearInterval(pollInterval), 300_000);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : (err as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Failed to start analysis';
        setTriggerError(message);
      } finally {
        setTriggering(false);
      }
    },
    [mutateResume, mutateAnalysis],
  );

  return {
    analysis,
    status: resume?.status ?? null,
    loading: triggering,
    error: triggerError,
    triggerAnalysis,
  };
}