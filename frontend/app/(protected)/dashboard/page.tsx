'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/components/providers/AuthProvider';
import { getToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  stage: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
  source: 'LinkedIn' | 'Indeed' | 'Manual';
  appliedAt: string;
}

interface Alert {
  id: string;
  message: string;
  time: string;
}

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'All' | Application['stage']>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | Application['source']>('All');
  const [sortBy, setSortBy] = useState<'appliedAt' | 'stage'>('appliedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getToken();

        const [appsRes, alertsRes] = await Promise.all([
          axios.get(`${backendUrl}/jobs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${backendUrl}/alerts`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => ({ data: { alerts: [] } })),
        ]);

        setApplications(
          appsRes.data.jobs.map((j: any) => ({
            id: j.id.toString(),
            company: j.company,
            role: j.title,
            location: j.location || 'Remote',
            stage: 'Applied',
            source: 'Manual',
            appliedAt: j.created_at || new Date().toISOString(),
          })),
        );

        setAlerts(alertsRes.data.alerts || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, backendUrl]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Your existing filtering/sorting/rendering logic goes here
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Welcome, {user?.full_name || 'User'}
      </h1>
      {/* ... rest of dashboard UI ... */}
    </div>
  );
}