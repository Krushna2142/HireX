/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/components/providers/AuthProvider';
import StatCard from '@/components/dashboard/StatCard';

type Application = {
  id: string;
  company: string;
  role: string;
  location: string;
  salary?: string;
  stage: 'Applied' | 'Screen' | 'Interview' | 'Offer' | 'Rejected';
  appliedAt: string;
  source: 'LinkedIn' | 'Company' | 'Referral' | 'Other';
};

type Alert = {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  createdAt: string;
};

// ✅ Helper to sort by stage
const STAGE_ORDER: Application['stage'][] = [
  'Applied',
  'Screen',
  'Interview',
  'Offer',
  'Rejected',
];

function stageIndex(stage: Application['stage']): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? STAGE_ORDER.length : idx;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'All' | Application['stage']>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | Application['source']>('All');
  const [sortBy, setSortBy] = useState<'appliedAt' | 'stage'>('appliedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setApplications([]);
        setAlerts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const token = typeof window !== 'undefined' ? localStorage.getItem('jc_token') : null;

        const [appsRes, alertsRes] = await Promise.all([
          axios.get(`${backendUrl}/jobs`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          axios.get(`${backendUrl}/alerts`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        setApplications(
          appsRes.data.jobs.map((j: any) => ({
            id: j.id.toString(),
            company: j.company,
            role: j.title,
            location: 'Remote',
            stage: 'Applied',
            appliedAt: new Date().toISOString(),
            source: 'LinkedIn',
          }))
        );

        setAlerts(alertsRes.data.alerts ?? []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setApplications([]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading, backendUrl]);

  const filtered = useMemo(() => {
    let items = [...applications];

    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q)
      );
    }

    if (stageFilter !== 'All') {
      items = items.filter((a) => a.stage === stageFilter);
    }

    if (sourceFilter !== 'All') {
      items = items.filter((a) => a.source === sourceFilter);
    }

    items.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      if (sortBy === 'appliedAt') {
        return (
          (new Date(a.appliedAt).getTime() -
            new Date(b.appliedAt).getTime()) * dir
        );
      }

      return (stageIndex(a.stage) - stageIndex(b.stage)) * dir;
    });

    return items;
  }, [applications, query, stageFilter, sourceFilter, sortBy, sortDir]);

  const stats = useMemo(() => {
    const total = applications.length;
    const interviewing = applications.filter((a) => a.stage === 'Interview').length;
    const offers = applications.filter((a) => a.stage === 'Offer').length;
    const rejected = applications.filter((a) => a.stage === 'Rejected').length;
    const weekNew = applications.filter(
      (a) =>
        Date.now() - new Date(a.appliedAt).getTime() <
        7 * 86400000
    ).length;

    return { total, interviewing, offers, rejected, weekNew };
  }, [applications]);

  if (authLoading || loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <section className="px-6 py-10 text-center">
        <h2 className="text-2xl font-bold">Please login to access dashboard</h2>
      </section>
    );
  }

  // suppress unused variable warnings for filter states not used in JSX yet
  void filtered;
  void query; void setQuery;
  void stageFilter; void setStageFilter;
  void sourceFilter; void setSourceFilter;
  void sortBy; void setSortBy;
  void sortDir; void setSortDir;
  void alerts;

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="section-header">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <p className="text-[var(--text-muted)]">
        Track applications, monitor pipeline, and act on alerts.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Interviewing" value={stats.interviewing} accent="var(--neon-1)" />
        <StatCard label="Offers" value={stats.offers} accent="var(--neon-3)" />
        <StatCard label="Rejected" value={stats.rejected} accent="#ef4444" />
        <StatCard label="New this week" value={stats.weekNew} accent="var(--neon-2)" />
      </div>

      {/* rest of your UI */}
    </section>
  );
}