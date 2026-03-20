// frontend/hooks/useRealtime.ts
// Central real-time data layer — SWR-backed, zero polling loops.
// All hooks auto-revalidate on focus, reconnect, and at defined intervals.

import useSWR, { mutate as globalMutate } from 'swr';
import api from '@/lib/axios';

export const fetcher = (url: string) => api.get(url).then(r => r.data);

const INTERVALS = {
  jobs:            30_000,
  alerts:           8_000,
  applications:    15_000,
  resumes:         10_000,
  recommendations: 60_000,
  recruiterJobs:   15_000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UnifiedJob {
  id:             string;
  source:         'internal' | 'serpapi';
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description:    string;
  postedAt:       string;
  applyUrl:       string | null;
  recruiterName:  string | null;
  applicantCount: number;
  matchScore?:    number;
}

export interface RecruiterJob extends UnifiedJob {
  status: 'active' | 'closed' | 'draft';
  _count: { applications: number };
}

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'rejected'
  | 'hired';

export interface Application {
  id:         string;
  job_id:     string;
  status:     ApplicationStatus;
  applied_at: string;
  candidate?: { id: string; name: string; email: string };
  jobs?:      { title: string; company: string };
}

export interface Resume {
  id:        string;
  fileName?: string;
  rawFile?:  string;
  status:    'uploaded' | 'processing' | 'analyzed' | 'failed';
  createdAt: string;
}

export interface Alert {
  id:         string;
  type:       string;
  title:      string;
  message:    string;
  read:       boolean;
  created_at: string;
  metadata?:  Record<string, unknown>;
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

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useJobs(params?: {
  search?:   string;
  workMode?: string;
  source?:   'all' | 'internal' | 'serpapi';
}) {
  const query = new URLSearchParams();
  if (params?.search   && params.search   !== '') query.set('search',   params.search);
  if (params?.workMode && params.workMode !== '') query.set('workMode', params.workMode);
  if (params?.source   && params.source   !== 'all') query.set('source', params.source);

  const key = `/jobs${query.toString() ? `?${query}` : ''}`;

  const { data, error, isLoading, isValidating } = useSWR<{
    jobs:    UnifiedJob[];
    total:   number;
    sources: { internal: number; serpapi: number };
  }>(key, fetcher, {
    refreshInterval:       INTERVALS.jobs,
    revalidateOnFocus:     true,
    revalidateOnReconnect: true,
    dedupingInterval:      5_000,
  });

  return {
    jobs:       data?.jobs    ?? [],
    total:      data?.total   ?? 0,
    sources:    data?.sources ?? { internal: 0, serpapi: 0 },
    loading:    isLoading,
    validating: isValidating,
    error:      error?.message ?? null,
    refresh:    () => globalMutate(key),
  };
}

export function useRecommendations() {
  const { data, error, isLoading } = useSWR<UnifiedJob[]>(
    '/jobs/recommendations', fetcher,
    { refreshInterval: INTERVALS.recommendations, revalidateOnFocus: true, revalidateOnReconnect: true },
  );
  return {
    recommendations: data ?? [],
    loading:         isLoading,
    error:           error?.message ?? null,
  };
}

export function useMyApplications() {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    '/jobs/applications/mine', fetcher,
    { refreshInterval: INTERVALS.applications, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  // Optimistic apply — adds a temp entry immediately, then revalidates
  const applyOptimistic = async (jobId: string) => {
    const optimistic: Application[] = [
      ...(data ?? []),
      {
        id:         `temp_${jobId}`,
        job_id:     jobId,
        status:     'applied',
        applied_at: new Date().toISOString(),
      },
    ];
    await mutate(optimistic, false);
    try { await api.post(`/jobs/${jobId}/apply`); }
    catch { await mutate(); }
    await mutate();
  };

  return {
    applications:    data ?? [],
    loading:         isLoading,
    error:           error?.message ?? null,
    applyOptimistic,
    refresh:         () => mutate(),
  };
}

export function useJobApplicants(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    jobId ? `/jobs/${jobId}/applicants` : null, fetcher,
    { refreshInterval: INTERVALS.recruiterJobs, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  const updateStatus = async (appId: string, status: ApplicationStatus) => {
    const optimistic = (data ?? []).map((a: Application) =>
      a.id === appId ? { ...a, status } : a,
    );
    await mutate(optimistic, false);
    try { await api.patch(`/jobs/applications/${appId}/status`, { status }); }
    catch { await mutate(); }
    await mutate();
  };

  return {
    applicants:   data ?? [],
    loading:      isLoading,
    error:        error?.message ?? null,
    updateStatus,
    refresh:      () => mutate(),
  };
}

export function useRecruiterJobs() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<RecruiterJob[]>(
    '/jobs/mine', fetcher,
    { refreshInterval: INTERVALS.recruiterJobs, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  const postJob = async (payload: Record<string, unknown>): Promise<RecruiterJob> => {
    const { data: newJob } = await api.post<RecruiterJob>('/jobs', payload);
    await mutate([newJob, ...(data ?? [])]);
    return newJob;
  };

  const toggleStatus = async (jobId: string, current: RecruiterJob['status']) => {
    const next = current === 'active' ? 'closed' : 'active';
    await api.patch(`/jobs/${jobId}/status`, { status: next });
    await mutate(
      (data ?? []).map((j: RecruiterJob) =>
        j.id === jobId ? { ...j, status: next as RecruiterJob['status'] } : j,
      ),
    );
  };

  // Cache stats for sidebar live pill
  if (typeof window !== 'undefined' && data) {
    try {
      localStorage.setItem('jc_recruiter_stats', JSON.stringify({
        activeJobs:    data.filter((j: RecruiterJob) => j.status === 'active').length,
        // ✅ Fix: _count?.applications — safe even if backend omits _count
        newApplicants: data.reduce((n: number, j: RecruiterJob) =>
          n + (j._count?.applications ?? 0), 0),
      }));
    } catch { /* quota exceeded or SSR — ignore */ }
  }

  return {
    jobs:       data ?? [],
    loading:    isLoading,
    validating: isValidating,
    error:      error?.message ?? null,
    postJob,
    toggleStatus,
    refresh:    () => mutate(),
  };
}

export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[]>(
    '/resumes', fetcher,
    { refreshInterval: INTERVALS.resumes, revalidateOnFocus: true, revalidateOnReconnect: true },
  );
  return {
    resumes:  data ?? [],
    loading:  isLoading,
    error:    error?.message ?? null,
    refresh:  () => mutate(),
  };
}

export function useLatestResume() {
  const { data, error, isLoading, mutate } = useSWR<Resume | null>(
    '/resumes/latest', fetcher,
    { refreshInterval: INTERVALS.resumes, revalidateOnFocus: true, revalidateOnReconnect: true },
  );
  return {
    resume:  data ?? null,
    loading: isLoading,
    error:   error?.message ?? null,
    refresh: () => mutate(),
  };
}

export function useResumeAnalysis(resumeId: string | null) {
  const { data: resume } = useSWR<Resume>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher,
    {
      refreshInterval: (cur: Resume | undefined) => {
        if (!cur || cur.status === 'uploaded' || cur.status === 'failed') return 10_000;
        if (cur.status === 'processing') return 5_000;
        return 30_000;
      },
      revalidateOnFocus: true,
    },
  );

  const { data: analysis } = useSWR<ResumeAnalysis>(
    resume?.status === 'analyzed' && resumeId
      ? `/resumes/${resumeId}/analysis`
      : null,
    fetcher,
  );

  const triggerAnalysis = async (id: string) => {
    await api.post(`/resumes/${id}/analyse`);
    await globalMutate(`/resumes/${id}`);
    await globalMutate('/resumes');
    await globalMutate('/resumes/latest');
  };

  return { resume, analysis, status: resume?.status ?? null, triggerAnalysis };
}

export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR<Alert[]>(
    '/alerts', fetcher,
    { refreshInterval: INTERVALS.alerts, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  const unreadCount = (data ?? []).filter((a: Alert) => !a.read).length;

  const markRead = async (alertId: string) => {
    await mutate(
      (data ?? []).map((a: Alert) => a.id === alertId ? { ...a, read: true } : a),
      false,
    );
    try { await api.patch(`/alerts/${alertId}/read`); }
    catch { await mutate(); }
  };

  const markAllRead = async () => {
    await mutate(
      (data ?? []).map((a: Alert) => ({ ...a, read: true })),
      false,
    );
    try { await api.patch('/alerts/read-all'); }
    catch { await mutate(); }
  };

  return {
    alerts:      data ?? [],
    unreadCount,
    loading:     isLoading,
    error:       error?.message ?? null,
    markRead,
    markAllRead,
    refresh:     () => mutate(),
  };
}