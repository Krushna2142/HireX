// frontend/hooks/useRealTimeAlerts.tsx
// Central real-time data layer — SWR-backed, zero polling loops.

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
// toArray — defensive envelope normaliser
//
// Why this exists:
//   Several API endpoints were changed server-side to return envelopes like
//   { alerts: [...] } or { data: [...] } instead of plain arrays.
//   Calling .filter() on a plain object throws:
//     "TypeError: (e ?? []).filter is not a function"
//   which crashed the entire React tree.
//
//   This utility makes every consumer of array data resilient to that drift.
//   It checks:
//     1. Is it already a plain array?          → return as-is
//     2. Does it have a 'data' / 'items' key?  → unwrap
//     3. Does it have a custom fallback key?   → unwrap (e.g. 'alerts')
//     4. Anything else                         → return []
// ─────────────────────────────────────────────────────────────────────────────

function toArray<T>(raw: unknown, fallbackKey?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];

  const obj = raw as Record<string, unknown>;
  for (const key of ['data', 'items', 'results', fallbackKey].filter(Boolean) as string[]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id:             string;
  source:         JobSource;
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

export interface JobSources {
  internal: number;
  serpapi:  number;
  linkedin: number;
  indeed:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// useJobs — with pagination (page, limit, totalPages, currentPage)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 12;

export function useJobs(params?: {
  search?:   string;
  workMode?: string;
  source?:   'all' | 'internal' | 'serpapi' | 'linkedin' | 'indeed';
  page?:     number;
  limit?:    number;
}) {
  const page  = params?.page  ?? 1;
  const limit = params?.limit ?? DEFAULT_PAGE_SIZE;

  const query = new URLSearchParams();
  if (params?.search   && params.search   !== '') query.set('search',   params.search);
  if (params?.workMode && params.workMode !== '') query.set('workMode', params.workMode);
  if (params?.source)                             query.set('source',   params.source);
  query.set('page',  String(page));
  query.set('limit', String(limit));

  const key = `/jobs?${query.toString()}`;

  const { data, error, isLoading, isValidating } = useSWR<{
    jobs:    UnifiedJob[];
    total:   number;
    sources: JobSources;
  }>(key, fetcher, {
    refreshInterval:       INTERVALS.jobs,
    revalidateOnFocus:     true,
    revalidateOnReconnect: true,
    dedupingInterval:      5_000,
    keepPreviousData:      true,
  });

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs:        data?.jobs    ?? [],
    total,
    sources:     data?.sources ?? { internal: 0, serpapi: 0, linkedin: 0, indeed: 0 },
    loading:     isLoading,
    validating:  isValidating,
    error:       error?.message ?? null,
    refresh:     () => globalMutate(key),
    totalPages,
    currentPage: page,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRecommendations
//
// FIX: /jobs/recommendations returns 500 server-side.
//   • Added onErrorRetry to stop hammering a broken endpoint — backs off after
//     3 attempts instead of retrying on a tight 60s loop.
//   • toArray() added so a partial/envelope response doesn't cause a crash
//     while the backend issue is being fixed.
//
// The 500 itself is a backend bug — check your Render logs. Most common cause:
//   Prisma include on a missing relation, or a null matchScore computation.
// ─────────────────────────────────────────────────────────────────────────────

export function useRecommendations() {
  const { data, error, isLoading } = useSWR<unknown>(
    '/jobs/recommendations', fetcher,
    {
      refreshInterval:       INTERVALS.recommendations,
      revalidateOnFocus:     true,
      revalidateOnReconnect: true,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        // Stop retrying 500s after 3 attempts to avoid log spam on Render
        if (err?.response?.status >= 500 && retryCount >= 3) return;
        setTimeout(() => revalidate({ retryCount }), 10_000);
      },
    },
  );

  return {
    recommendations: toArray<UnifiedJob>(data),
    loading:         isLoading,
    error:           error?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useMyApplications
// ─────────────────────────────────────────────────────────────────────────────

export function useMyApplications() {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    '/jobs/applications/mine', fetcher,
    { refreshInterval: INTERVALS.applications, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

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
    void mutate();
  };

  return {
    applications:    data ?? [],
    loading:         isLoading,
    error:           error?.message ?? null,
    applyOptimistic,
    refresh:         () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useJobApplicants
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// useRecruiterJobs
// ─────────────────────────────────────────────────────────────────────────────

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

  if (typeof window !== 'undefined' && data) {
    try {
      localStorage.setItem('jc_recruiter_stats', JSON.stringify({
        activeJobs:    data.filter((j: RecruiterJob) => j.status === 'active').length,
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

// ─────────────────────────────────────────────────────────────────────────────
// useResumes
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// useLatestResume
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// useResumeAnalysis
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// useAlerts
//
// FIX: Crash "TypeError: (e ?? []).filter is not a function"
//
// Root cause:
//   The /alerts endpoint returned an envelope object, e.g.:
//     { alerts: [...], unreadCount: 3 }
//   instead of a plain array.
//   Calling .filter() on {} always throws this TypeError.
//
// Fix:
//   1. SWR data type widened to `unknown` — we don't assume the shape
//   2. toArray(raw, 'alerts') normalises any response into a guaranteed
//      Alert[] — checking for plain array first, then data/items/alerts keys
//   3. All downstream .filter() / .map() calls now operate on the safe array
// ─────────────────────────────────────────────────────────────────────────────

export function useAlerts() {
  const { data: raw, error, isLoading, mutate } = useSWR<unknown>(
    '/alerts', fetcher,
    { refreshInterval: INTERVALS.alerts, revalidateOnFocus: true, revalidateOnReconnect: true },
  );

  // Normalise to a guaranteed Alert[] — safe regardless of what the API returns
  const data = toArray<Alert>(raw, 'alerts');

  const unreadCount = data.filter((a: Alert) => !a.read).length;

  const markRead = async (alertId: string) => {
    await mutate(
      data.map((a: Alert) => a.id === alertId ? { ...a, read: true } : a),
      false,
    );
    try { await api.patch(`/alerts/${alertId}/read`); }
    catch { await mutate(); }
  };

  const markAllRead = async () => {
    await mutate(
      data.map((a: Alert) => ({ ...a, read: true })),
      false,
    );
    try { await api.patch('/alerts/read-all'); }
    catch { await mutate(); }
  };

  return {
    alerts:      data,
    unreadCount,
    loading:     isLoading,
    error:       error?.message ?? null,
    markRead,
    markAllRead,
    refresh:     () => mutate(),
  };
}
