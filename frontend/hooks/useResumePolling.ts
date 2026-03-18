// hooks/useResumePolling.ts
// SWR-backed adapter — replaces the old polling-loop approach.
// ResumeAnalysisTab.tsx imports from here unchanged.

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import api from '@/lib/axios';

const fetcher = (url: string) => api.get(url).then(r => r.data);

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
  experienceYears: number;
  experienceLevel: string;
  topSkills:       string[];
  industryTags:    string[];
  trajectory?:     string;
  status:          string;
}

// Polls every 8s normally, drops to 5s while processing
export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[]>(
    '/resumes',
    fetcher,
    { refreshInterval: 8_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  return {
    resumes: data ?? [],
    loading: isLoading,
    error:   error?.message ?? null,
    reload:  useCallback(async () => { await mutate(); }, [mutate]),
  };
}

// Watches one resume's status; loads analysis when ready
export function useAnalysis(resumeId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const { data: resume, mutate: mutateResume } = useSWR<Resume>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher,
    {
      refreshInterval: (cur: Resume | undefined) =>
        cur?.status === 'processing' ? 5_000 : cur?.status === 'analyzed' ? 30_000 : 8_000,
      revalidateOnFocus: true,
    },
  );

  const { data: analysis, mutate: mutateAnalysis } = useSWR<ResumeAnalysis>(
    resume?.status === 'analyzed' && resumeId ? `/resumes/${resumeId}/analysis` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const triggerAnalysis = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/resumes/${id}/analyse`);
      await mutateResume();
      await mutateAnalysis();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to start analysis');
    } finally {
      setLoading(false);
    }
  }, [mutateResume, mutateAnalysis]);

  return {
    analysis,
    status:  resume?.status ?? null,
    loading,
    error,
    triggerAnalysis,
  };
}