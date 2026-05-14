// frontend/hooks/useRealTimeAlerts.tsx
// Central real-time data layer — SWR-backed, no manual polling loops.

import useSWR, { mutate as globalMutate } from 'swr';
import api from '@/lib/axios';

export const fetcher = (url: string) => api.get(url).then((r) => r.data);

const INTERVALS = {
  jobs: 30_000,
  alerts: 8_000,
  applications: 15_000,
  resumes: 10_000,
  recommendations: 60_000,
  recruiterJobs: 15_000,
};

function toArray<T>(raw: unknown, fallbackKey?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];

  const obj = raw as Record<string, unknown>;

  for (const key of ['data', 'items', 'results', fallbackKey].filter(Boolean) as string[]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }

  return [];
}

type ApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
      detail?: string;
      error?: string;
    };
  };
  message?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  postedAt: string;
  applyUrl: string | null;
  recruiterName: string | null;
  applicantCount: number;
  matchScore?: number;
  atsScore?: number;
  atsRecommendation?: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  matchedSkills?: string[];
  missingSkills?: string[];
  matchReason?: string;
  atsReason?: string;
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
  id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string;
  candidate?: { id: string; name: string; email: string };
  jobs?: { title: string; company: string };
}

export interface Resume {
  id: string;
  fileName?: string;
  rawFile?: string;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  createdAt: string;
  analysisError?: string | null;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  experienceYears: number;
  experienceLevel: string;
  topSkills: string[];
  industryTags: string[];
  trajectory?: string;
  status: string;
}

export interface JobSources {
  internal: number;
  serpapi: number;
  linkedin: number;
  indeed: number;
}

export interface RecommendationsEnvelope {
  recommendations?: UnifiedJob[];
  jobs?: UnifiedJob[];
  selectedResume?: {
    id?: string;
    fileName?: string | null;
    topSkills?: string[];
    industryTags?: string[];
    experienceLevel?: string | null;
    experienceYears?: number | null;
  } | null;
  profile?: {
    skills?: string[];
    experienceLevel?: string;
    experienceYears?: number;
    currentTitle?: string | null;
    industryTags?: string[];
  } | null;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// useJobs
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 12;

export function useJobs(params?: {
  search?: string;
  workMode?: string;
  source?: 'all' | 'internal' | 'serpapi' | 'linkedin' | 'indeed';
  page?: number;
  limit?: number;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? DEFAULT_PAGE_SIZE;

  const query = new URLSearchParams();

  if (params?.search && params.search !== '') query.set('search', params.search);
  if (params?.workMode && params.workMode !== '') query.set('workMode', params.workMode);
  if (params?.source) query.set('source', params.source);

  query.set('page', String(page));
  query.set('limit', String(limit));

  const key = `/jobs?${query.toString()}`;

  const { data, error, isLoading, isValidating } = useSWR<{
    jobs: UnifiedJob[];
    total: number;
    sources: JobSources;
  }>(key, fetcher, {
    refreshInterval: INTERVALS.jobs,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    keepPreviousData: true,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs: data?.jobs ?? [],
    total,
    sources: data?.sources ?? {
      internal: 0,
      serpapi: 0,
      linkedin: 0,
      indeed: 0,
    },
    loading: isLoading,
    validating: isValidating,
    error: error?.message ?? null,
    refresh: () => globalMutate(key),
    totalPages,
    currentPage: page,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRecommendations
//
// IMPORTANT:
// Old endpoint `/jobs/recommendations` was profile/static-style.
// New endpoint is resume-specific:
// `/recommendations/jobs?limit=12&resumeId=<resume_id>`
// ─────────────────────────────────────────────────────────────────────────────

export function useRecommendations(resumeId?: string | null) {
  const key = resumeId
    ? `/recommendations/jobs?limit=12&resumeId=${encodeURIComponent(resumeId)}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    RecommendationsEnvelope | UnifiedJob[]
  >(key, fetcher, {
    refreshInterval: INTERVALS.recommendations,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    onErrorRetry: (err: ApiError, _key, _config, revalidate, { retryCount }) => {
      if ((err?.response?.status ?? 0) >= 500 && retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 10_000);
    },
  });

  const envelope = data && !Array.isArray(data) ? data : undefined;

  return {
    recommendations:
      envelope?.recommendations ??
      envelope?.jobs ??
      toArray<UnifiedJob>(data),
    selectedResume: envelope?.selectedResume ?? null,
    profile: envelope?.profile ?? null,
    reason: envelope?.reason ?? null,
    loading: isLoading,
    validating: isValidating,
    error:
      (error as ApiError | undefined)?.response?.data?.detail ??
      (error as ApiError | undefined)?.response?.data?.message ??
      (error as ApiError | undefined)?.response?.data?.error ??
      error?.message ??
      null,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useMyApplications
// ─────────────────────────────────────────────────────────────────────────────

export function useMyApplications() {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    '/jobs/applications/mine',
    fetcher,
    {
      refreshInterval: INTERVALS.applications,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const applyOptimistic = async (jobId: string) => {
    const optimistic: Application[] = [
      ...(data ?? []),
      {
        id: `temp_${jobId}`,
        job_id: jobId,
        status: 'applied',
        applied_at: new Date().toISOString(),
      },
    ];

    await mutate(optimistic, false);
    void mutate();
  };

  return {
    applications: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    applyOptimistic,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useJobApplicants
// ─────────────────────────────────────────────────────────────────────────────

export function useJobApplicants(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Application[]>(
    jobId ? `/jobs/${jobId}/applicants` : null,
    fetcher,
    {
      refreshInterval: INTERVALS.recruiterJobs,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const updateStatus = async (appId: string, status: ApplicationStatus) => {
    const optimistic = (data ?? []).map((a) =>
      a.id === appId ? { ...a, status } : a,
    );

    await mutate(optimistic, false);

    try {
      await api.patch(`/jobs/applications/${appId}/status`, { status });
    } catch {
      await mutate();
    }

    await mutate();
  };

  return {
    applicants: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    updateStatus,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRecruiterJobs
// ─────────────────────────────────────────────────────────────────────────────

export function useRecruiterJobs() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<RecruiterJob[]>(
    '/jobs/mine',
    fetcher,
    {
      refreshInterval: INTERVALS.recruiterJobs,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
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
      (data ?? []).map((j) =>
        j.id === jobId ? { ...j, status: next as RecruiterJob['status'] } : j,
      ),
    );
  };

  if (typeof window !== 'undefined' && data) {
    try {
      localStorage.setItem(
        'jc_recruiter_stats',
        JSON.stringify({
          activeJobs: data.filter((j) => j.status === 'active').length,
          newApplicants: data.reduce(
            (n, j) => n + (j._count?.applications ?? 0),
            0,
          ),
        }),
      );
    } catch {
      // ignore localStorage errors
    }
  }

  return {
    jobs: data ?? [],
    loading: isLoading,
    validating: isValidating,
    error: error?.message ?? null,
    postJob,
    toggleStatus,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useResumes
// ─────────────────────────────────────────────────────────────────────────────

export function useResumes() {
  const { data, error, isLoading, mutate } = useSWR<Resume[]>(
    '/resumes',
    fetcher,
    {
      refreshInterval: INTERVALS.resumes,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    resumes: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLatestResume
// ─────────────────────────────────────────────────────────────────────────────

export function useLatestResume() {
  const { data, error, isLoading, mutate } = useSWR<Resume | null>(
    '/resumes/latest',
    fetcher,
    {
      refreshInterval: INTERVALS.resumes,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  return {
    resume: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refresh: () => mutate(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useResumeAnalysis
// ─────────────────────────────────────────────────────────────────────────────

export function useResumeAnalysis(resumeId: string | null) {
  const { data: resume, mutate: mutateResume } = useSWR<Resume>(
    resumeId ? `/resumes/${resumeId}` : null,
    fetcher,
    {
      refreshInterval: (cur: Resume | undefined) => {
        if (!cur || cur.status === 'uploaded' || cur.status === 'failed') return 10_000;
        if (cur.status === 'processing') return 5_000;
        return 30_000;
      },
      revalidateOnFocus: true,
      onSuccess: (data) => {
        if (data.status === 'analyzed') {
          void globalMutate('/resumes');
          void globalMutate('/resumes/latest');
          void globalMutate(`/resumes/${data.id}/analysis`);

          void globalMutate(
            `/recommendations/jobs?limit=12&resumeId=${encodeURIComponent(data.id)}`,
          );

          // Clear any old stale cache from previous implementation.
          void globalMutate('/jobs/recommendations');
        }
      },
    },
  );

  const { data: analysis, mutate: mutateAnalysis } = useSWR<ResumeAnalysis>(
    resume?.status === 'analyzed' && resumeId
      ? `/resumes/${resumeId}/analysis`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  const triggerAnalysis = async (id: string) => {
    await api.post(`/resumes/${id}/analyse`);

    await Promise.all([
      mutateResume(),
      mutateAnalysis(),
      globalMutate(`/resumes/${id}`),
      globalMutate('/resumes'),
      globalMutate('/resumes/latest'),
      globalMutate(
        `/recommendations/jobs?limit=12&resumeId=${encodeURIComponent(id)}`,
      ),
      globalMutate('/jobs/recommendations'),
    ]);
  };

  return {
    resume,
    analysis,
    status: resume?.status ?? null,
    triggerAnalysis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAlerts
// ─────────────────────────────────────────────────────────────────────────────

export function useAlerts() {
  const { data: raw, error, isLoading, mutate } = useSWR<unknown>(
    '/alerts',
    fetcher,
    {
      refreshInterval: INTERVALS.alerts,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const data = toArray<Alert>(raw, 'alerts');
  const unreadCount = data.filter((a) => !a.read).length;

  const markRead = async (alertId: string) => {
    await mutate(
      data.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
      false,
    );

    try {
      await api.patch(`/alerts/${alertId}/read`);
    } catch {
      await mutate();
    }
  };

  const markAllRead = async () => {
    await mutate(
      data.map((a) => ({ ...a, read: true })),
      false,
    );

    try {
      await api.patch('/alerts/read-all');
    } catch {
      await mutate();
    }
  };

  return {
    alerts: data,
    unreadCount,
    loading: isLoading,
    error: error?.message ?? null,
    markRead,
    markAllRead,
    refresh: () => mutate(),
  };
}