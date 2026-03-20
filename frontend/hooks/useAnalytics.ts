'use client';

import useSWR from 'swr';
import api from '@/lib/axios';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecruiterAnalytics {
  kpis: {
    totalJobs:        number;
    activeJobs:       number;
    totalApplicants:  number;
    shortlisted:      number;
    hired:            number;
    avgTimeToFill:    number; // days
  };
  applicationsByStatus: { status: string; count: number; color: string }[];
  applicationsOverTime: { date: string; count: number }[];
  topJobs: {
    title:      string;
    applicants: number;
    shortlisted:number;
  }[];
  recentApplications: {
    id:           string;
    candidateName:string;
    jobTitle:     string;
    status:       string;
    appliedAt:    string;
  }[];
  skillDemand: { skill: string; count: number }[];
}

export interface CandidateAnalytics {
  kpis: {
    totalApplications: number;
    underReview:       number;
    interviews:        number;
    offers:            number;
    profileViews:      number;
    matchScore:        number; // 0-100
  };
  applicationsByStatus: { status: string; count: number; color: string }[];
  activityOverTime:     { date: string; applications: number; views: number }[];
  skillMatch: {
    skill:    string;
    have:     number; // 0-100
    required: number; // 0-100
  }[];
  recentActivity: {
    id:        string;
    type:      string;
    message:   string;
    timestamp: string;
  }[];
  applicationFunnel: { stage: string; count: number }[];
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useRecruiterAnalytics() {
  const { data, isLoading, error } = useSWR<RecruiterAnalytics>(
    '/recruiter/analytics',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  // Safe defaults — UI never crashes on empty data
  const analytics: RecruiterAnalytics = data ?? {
    kpis: {
      totalJobs: 0, activeJobs: 0, totalApplicants: 0,
      shortlisted: 0, hired: 0, avgTimeToFill: 0,
    },
    applicationsByStatus: [],
    applicationsOverTime: [],
    topJobs:              [],
    recentApplications:   [],
    skillDemand:          [],
  };

  return { analytics, loading: isLoading, error };
}

export function useCandidateAnalytics() {
  const { data, isLoading, error } = useSWR<CandidateAnalytics>(
    '/candidate/analytics',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const analytics: CandidateAnalytics = data ?? {
    kpis: {
      totalApplications: 0, underReview: 0, interviews: 0,
      offers: 0, profileViews: 0, matchScore: 0,
    },
    applicationsByStatus: [],
    activityOverTime:     [],
    skillMatch:           [],
    recentActivity:       [],
    applicationFunnel:    [],
  };

  return { analytics, loading: isLoading, error };
}
