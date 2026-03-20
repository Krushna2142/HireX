// hooks/useJobs.pagination.ts
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in REPLACEMENT for the useJobs portion of useRealTimeAlerts.
//
// What changed vs. the original:
//   1. Accepts page + limit in the params object
//   2. Returns totalPages + currentPage alongside existing fields
//   3. Resets to page 1 automatically when search / workMode / source changes
//      (this is handled in the page component, not here — hook is stateless)
//
// Backend contract expected:
//   GET /jobs?search=&workMode=&source=&page=1&limit=12
//   → {
//       jobs:    UnifiedJob[];
//       total:   number;          // total matching records across all pages
//       sources: { internal: number; serpapi: number; linkedin: number; indeed: number };
//     }
//
// The hook derives totalPages = Math.ceil(total / limit) locally.
// This avoids a backend breaking change if your API doesn't return totalPages yet.
// ─────────────────────────────────────────────────────────────────────────────

import useSWR, { mutate } from 'swr';
import api from '@/lib/axios';

// ── Public types (re-exported so page.tsx imports from one place) ─────────────

export type JobSource = 'internal' | 'serpapi' | 'linkedin' | 'indeed';

export interface UnifiedJob {
  id:             string;
  title:          string;
  company:        string;
  location?:      string;
  workMode?:      string;
  employmentType?: string;
  salaryMin?:     number | null;
  salaryMax?:     number | null;
  description?:   string;
  requiredSkills: string[];
  matchScore?:    number | null;
  applyUrl?:      string;
  postedAt:       string;
  applicantCount?: number;
  recruiterName?:  string;
  source:         JobSource;
}

export interface Application {
  id:         string;
  job_id:     string;
  status:     string;
  appliedAt:  string;
}

// ── Hook params ───────────────────────────────────────────────────────────────

export interface UseJobsParams {
  search?:   string;
  workMode?: string;
  source?:   'all' | JobSource;
  page?:     number;   // 1-indexed, defaults to 1
  limit?:    number;   // defaults to 12
}

// ── API response shape ────────────────────────────────────────────────────────

interface JobsApiResponse {
  jobs:    UnifiedJob[];
  total:   number;
  sources: {
    internal: number;
    serpapi:  number;
    linkedin: number;
    indeed:   number;
  };
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 12;

async function fetchJobs(url: string): Promise<JobsApiResponse> {
  const { data } = await api.get<JobsApiResponse>(url);
  return data;
}

function buildKey(params: UseJobsParams): string {
  const {
    search   = '',
    workMode = '',
    source   = 'all',
    page     = 1,
    limit    = DEFAULT_LIMIT,
  } = params;

  const qs = new URLSearchParams({
    ...(search   && { search }),
    ...(workMode && { workMode }),
    ...(source !== 'all' && { source }),
    page:  String(page),
    limit: String(limit),
  });

  return `/jobs?${qs.toString()}`;
}

// ── useJobs ───────────────────────────────────────────────────────────────────

export function useJobs(params: UseJobsParams = {}) {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const key   = buildKey(params);

  const { data, error, isValidating } = useSWR<JobsApiResponse>(key, fetchJobs, {
    refreshInterval:       30_000,   // poll every 30s for live updates
    revalidateOnFocus:     true,
    revalidateOnReconnect: true,
    keepPreviousData:      true,     // prevents flicker between pages
  });

  const total      = data?.total   ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs:        data?.jobs     ?? [],
    total,
    totalPages,
    currentPage: params.page ?? 1,
    sources:     data?.sources  ?? { internal: 0, serpapi: 0, linkedin: 0, indeed: 0 },
    loading:     !data && !error,
    validating:  isValidating,
    error:       error ? (error?.response?.data?.message ?? 'Failed to load jobs') : null,
    refresh:     () => mutate(key),
  };
}

// ── useMyApplications (unchanged from original) ───────────────────────────────

async function fetchApplications(url: string): Promise<Application[]> {
  const { data } = await api.get<Application[]>(url);
  return data ?? [];
}

export function useMyApplications() {
  const { data, mutate: mutateFn } = useSWR<Application[]>(
    '/applications/mine',
    fetchApplications,
    { revalidateOnFocus: true },
  );

  const applyOptimistic = (jobId: string) => {
    mutateFn(
      prev => [
        ...(prev ?? []),
        {
          id:        `optimistic-${jobId}`,
          job_id:    jobId,
          status:    'applied',
          appliedAt: new Date().toISOString(),
        },
      ],
      { revalidate: true },
    );
  };

  return {
    applications:    data ?? [],
    applyOptimistic,
  };
}
