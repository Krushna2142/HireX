/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null;

      if (!token) {
        setApplications([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const appsRes = await axios.get(`${backendUrl}/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
      } catch (error) {
        console.error('Error fetching data:', error);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, backendUrl]);

  const total = applications.length;
  const interviewing = applications.filter((a) => a.stage === 'Interview').length;
  const offers = applications.filter((a) => a.stage === 'Offer').length;
  const rejected = applications.filter((a) => a.stage === 'Rejected').length;
  const weekNew = applications.filter(
    (a) => Date.now() - new Date(a.appliedAt).getTime() < 7 * 86400000
  ).length;

  if (authLoading || loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <section className="px-6 py-10 text-center">
        <h2 className="text-2xl font-bold">Please login to access dashboard</h2>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="section-header">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <p className="text-[var(--text-muted)]">
        Track applications, monitor pipeline, and act on alerts.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        <StatCard label="Total" value={total} />
        <StatCard label="Interviewing" value={interviewing} accent="var(--neon-1)" />
        <StatCard label="Offers" value={offers} accent="var(--neon-3)" />
        <StatCard label="Rejected" value={rejected} accent="#ef4444" />
        <StatCard label="New this week" value={weekNew} accent="var(--neon-2)" />
      </div>

      {/* rest of your UI */}
    </section>
  );
}