'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import api from '@/lib/axios'; // ← still the only HTTP client

// ─────────────────────────────────────────────────────────────────────────────
// Two fetchers — same axios instance, different base paths.
//
//  backendFetcher : api.get(url)
//    → baseURL = NEXT_PUBLIC_API_URL (NestJS)
//    → Bearer token attached by interceptor
//    → Used for: /jobs (platform jobs from your DB)
//
//  nextFetcher : api.get(url, { baseURL: window.location.origin })
//    → Overrides baseURL for this call only
//    → Hits /api/jobs/serp on the same Next.js origin
//    → No Bearer token needed (server-side route, key is hidden)
//    → Used for: SERP proxy only
//
// Both calls go through the same axios instance — interceptors fire,
// error handling is consistent, no second client to maintain.
// ─────────────────────────────────────────────────────────────────────────────

const backendFetcher = (url: string) =>
  api.get(url).then((r) => r.data);

const nextFetcher = (url: string) =>
  api
    .get(url, {
      // Override baseURL for this specific call only.
      // window.location.origin resolves to http://localhost:3000 in dev
      // and https://yourapp.com in production automatically.
      baseURL: typeof window !== 'undefined' ? window.location.origin : '',
    })
    .then((r) => r.data);

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobSource = 'platform' | 'serp';

export interface CombinedJob {
  id:             string;
  source:         JobSource;
  title:          string;
  company:        string;
  location:       string;
  workMode:       string;
  employmentType: string;
  description:    string;
  requiredSkills: string[];
  salaryMin?:     number;
  salaryMax?:     number;
  postedAt:       string;
  applyUrl?:      string;
  recruiterName?: string;
  applicantCount: number;
  status:         'active' | 'closed' | 'draft';
}

interface RawSerpJob {
  job_id:        string;
  title:         string;
  company_name:  string;
  location:      string;
  description:   string;
  detected_extensions?: {
    work_from_home?: boolean;
    schedule_type?:  string;
  };
  job_highlights?: { title: string; items: string[] }[];
  apply_options?:  { link: string }[];
  posted_at?:      string;
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeSerpJob(raw: RawSerpJob): CombinedJob {
  const skills =
    raw.job_highlights
      ?.find((h) => h.title?.toLowerCase().includes('qualif'))
      ?.items.slice(0, 8) ?? [];

  return {
    id:             `serp_${raw.job_id}`,
    source:         'serp',
    title:          raw.title        ?? 'Untitled',
    company:        raw.company_name ?? '',
    location:       raw.location     ?? '',
    workMode:       raw.detected_extensions?.work_from_home ? 'remote' : 'onsite',
    employmentType: raw.detected_extensions?.schedule_type
      ?.toLowerCase().replace(/\s+/g, '_') ?? 'full_time',
    description:    raw.description  ?? '',
    requiredSkills: skills,
    postedAt:       raw.posted_at    ?? new Date().toISOString(),
    applyUrl:       raw.apply_options?.[0]?.link,
    applicantCount: 0,
    status:         'active',
  };
}

function normalizePlatformJob(raw: Partial<CombinedJob>): CombinedJob {
  return {
    id:             raw.id             ?? '',
    source:         'platform',
    title:          raw.title          ?? 'Untitled',
    company:        raw.company        ?? '',
    location:       raw.location       ?? '',
    workMode:       raw.workMode       ?? 'hybrid',
    employmentType: raw.employmentType ?? 'full_time',
    description:    raw.description    ?? '',
    requiredSkills: Array.isArray(raw.requiredSkills) ? raw.requiredSkills : [],
    salaryMin:      raw.salaryMin,
    salaryMax:      raw.salaryMax,
    postedAt:       raw.postedAt       ?? new Date().toISOString(),
    recruiterName:  raw.recruiterName,
    applicantCount: raw.applicantCount ?? 0,
    status:         raw.status         ?? 'active',
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCombinedJobs(searchQuery = '') {
  // NestJS backend — authenticated, real-time, 15s refresh
  const platformKey = searchQuery
    ? `/jobs?q=${encodeURIComponent(searchQuery)}`
    : '/jobs';

  // Next.js proxy — anonymous, cached 5min, no hammering SerpAPI
  const serpKey = `/api/jobs/serp?q=${encodeURIComponent(
    searchQuery || 'software engineer India'
  )}`;

  const { data: platformData, isLoading: platformLoading, error } =
    useSWR<CombinedJob[]>(platformKey, backendFetcher, {
      refreshInterval:   15_000,
      revalidateOnFocus: true,
      dedupingInterval:  4_000,
    });

  const { data: serpData, isLoading: serpLoading } =
    useSWR<RawSerpJob[]>(serpKey, nextFetcher, {
      revalidateOnFocus: false,
      dedupingInterval:  300_000, // 5 min — matches server cache
      refreshInterval:   0,       // manual refresh only
    });

  const combined = useMemo<CombinedJob[]>(() => {
    const platform = (Array.isArray(platformData) ? platformData : []).map(
      normalizePlatformJob
    );
    const serp = (Array.isArray(serpData) ? serpData : []).map(
      normalizeSerpJob
    );

    // Platform jobs win on dedup — recruiter-verified data always preferred
    const platformKeys = new Set(
      platform.map(
        (j) =>
          `${j.title.toLowerCase().trim()}__${j.company.toLowerCase().trim()}`
      )
    );

    const uniqueSerp = serp.filter(
      (j) =>
        !platformKeys.has(
          `${j.title.toLowerCase().trim()}__${j.company.toLowerCase().trim()}`
        )
    );

    return [...platform, ...uniqueSerp];
  }, [platformData, serpData]);

  return {
    jobs:          combined,
    loading:       platformLoading || serpLoading,
    platformCount: Array.isArray(platformData) ? platformData.length : 0,
    serpCount:     Array.isArray(serpData)     ? serpData.length     : 0,
    error:         error as Error | undefined,
  };
}