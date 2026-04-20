'use client';

import useSWR from 'swr';
import api from '@/lib/axios';
import { useAuth } from '@/components/providers/AuthProvider';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const cards = [
  { key: 'total_users', label: 'Total Users' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'recruiters', label: 'Recruiters' },
  { key: 'mock_interviews_completed', label: 'Mock Interviews' },
  { key: 'resumes_uploaded', label: 'Resumes Uploaded' },
  { key: 'resumes_analyzed', label: 'Resumes Analyzed' },
  { key: 'ats_scoring_runs', label: 'ATS Runs' },
  { key: 'interviews_scheduled', label: 'Scheduled' },
  { key: 'interviews_completed', label: 'Completed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
  { key: 'active_jobs', label: 'Active Jobs' },
] as const;

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading } = useSWR('/admin/dashboard', fetcher, {
    refreshInterval: 15000,
  });

  if (user && user.role !== 'admin') {
    return <div className="mx-auto max-w-4xl px-4 py-12">This area is only for the platform admin.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Exact counts from the live database for the current platform state.
        </p>
        {data?.generated_at ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {new Date(data.generated_at).toLocaleString()}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error.message || 'Failed to load admin metrics'}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-semibold">
                {data?.metrics?.[card.key] ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Revenue</p>
          <p className="mt-3 text-3xl font-semibold">{data?.metrics?.total_revenue ?? 0}</p>
          <p className="mt-2 text-sm text-muted-foreground">Current implementation reports exact stored revenue records when available.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Subscriptions</p>
          <p className="mt-3 text-3xl font-semibold">{data?.metrics?.active_subscriptions ?? 0}</p>
          <p className="mt-2 text-sm text-muted-foreground">Single-admin controls are live through this dashboard route.</p>
        </div>
      </div>
    </div>
  );
}
