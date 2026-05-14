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

  const { data: resume, mutate: mutateResume } = useSWR<Resume, Error>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher as Fetcher<Resume, string>,
    {
      refreshInterval: 0,
      revalidateOnFocus: true,
      onSuccess: (data: Resume) => {
        if (data.status === 'analyzed' && !didInvalidate.current) {
          didInvalidate.current = true;

          void globalMutate('/resumes');
          void globalMutate('/resumes/latest');
          void globalMutate(`/resumes/${data.id}/analysis`);

          // New recommendation endpoint, not old /jobs/recommendations.
          void globalMutate(
            `/recommendations/jobs?limit=12&resumeId=${encodeURIComponent(data.id)}`,
          );
        }

        if (data.status !== 'analyzed') {
          didInvalidate.current = false;
        }
      },
    },
  );

  const { data: analysis, mutate: mutateAnalysis } = useSWR<ResumeAnalysis, Error>(
    resume?.status === 'analyzed' && resumeId ? `/resumes/${resumeId}/analysis` : null,
    fetcher as Fetcher<ResumeAnalysis, string>,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  const triggerAnalysis = useCallback(
    async (id: string) => {
      setTriggering(true);
      setTriggerError(null);
      didInvalidate.current = false;

      try {
        await api.post(`/resumes/${id}/analyse`);

        await Promise.all([
          mutateResume(),
          mutateAnalysis(undefined),
          globalMutate('/resumes'),
          globalMutate('/resumes/latest'),
        ]);

        const pollInterval = setInterval(async () => {
          try {
            const latestResume = await api.get(`/resumes/${id}`);
            const latestStatus = latestResume.data?.status as ResumeStatus | undefined;

            if (latestStatus === 'analyzed') {
              clearInterval(pollInterval);

              await Promise.all([
                mutateResume(),
                globalMutate('/resumes'),
                globalMutate('/resumes/latest'),
                globalMutate(`/resumes/${id}/analysis`),
                globalMutate(
                  `/recommendations/jobs?limit=12&resumeId=${encodeURIComponent(id)}`,
                ),
              ]);
            }

            if (latestStatus === 'failed') {
              clearInterval(pollInterval);
              setTriggerError(
                latestResume.data?.analysisError ??
                  'Analysis failed. Please upload a cleaner PDF/DOCX or retry.',
              );

              await Promise.all([
                mutateResume(),
                globalMutate('/resumes'),
                globalMutate('/resumes/latest'),
              ]);
            }
          } catch {
            // ignore transient polling errors
          }
        }, 2_000);

        setTimeout(() => clearInterval(pollInterval), 300_000);
      } catch (err: unknown) {
        const errorObj = err as {
          response?: {
            data?: {
              message?: string;
              detail?: string;
            };
          };
          message?: string;
        };

        const message =
          errorObj.response?.data?.detail ??
          errorObj.response?.data?.message ??
          errorObj.message ??
          'Failed to start analysis';

        setTriggerError(message);
      } finally {
        setTriggering(false);
      }
    },
    [mutateResume, mutateAnalysis],
  );

  return {
    resume,
    analysis,
    status: resume?.status ?? null,
    loading: triggering,
    error: triggerError,
    triggerAnalysis,
  };
}