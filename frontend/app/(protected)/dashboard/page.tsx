/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity */
'use client';

import { useMemo, useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { getAuth } from 'firebase/auth';
import axios from 'axios';

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

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'All' | Application['stage']>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | Application['source']>('All');
  const [sortBy, setSortBy] = useState<'appliedAt' | 'stage'>('appliedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;
  const backendUrl = 'http://localhost:8000';  // Change to deployed URL (e.g., https://your-backend.railway.app)

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket(`${backendUrl.replace('http', 'ws')}/ws?token=${user?.getIdToken()}`, {
    shouldReconnect: () => true,
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [appsRes, alertsRes] = await Promise.all([
          axios.get(`${backendUrl}/jobs`, config),
          axios.get(`${backendUrl}/alerts`, config)
        ]);
        // Map backend response to frontend format
        setApplications(appsRes.data.jobs.map((j: any) => ({
          id: j.id.toString(),
          company: j.company,
          role: j.title,
          location: 'Remote',
          stage: 'Applied',
          appliedAt: new Date().toISOString(),
          source: 'LinkedIn'
        })));
        setAlerts(alertsRes.data.alerts);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, backendUrl]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'new_job') {
        setApplications(prev => [...prev, data.job]);
      } else if (data.type === 'update_alert') {
        setAlerts(prev => [data.alert, ...prev]);
      }
    }
  }, [lastMessage]);

  // Filtered and sorted
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
    if (stageFilter !== 'All') items = items.filter((a) => a.stage === stageFilter);
    if (sourceFilter !== 'All') items = items.filter((a) => a.source === sourceFilter);

    items.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'appliedAt') {
        return (new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()) * dir;
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
    const weekNew = applications.filter((a) => Date.now() - new Date(a.appliedAt).getTime() < 7 * 86400000).length;
    return { total, interviewing, offers, rejected, weekNew };
  }, [applications]);

  if (loading) return <div>Loading...</div>;

  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="section-header">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <p className="text-[var(--text-muted)]">Track applications, monitor pipeline, and act on alerts — with a clean dark UI and premium hover/border effects.</p>

      {/* Top stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Interviewing" value={stats.interviewing} accent="var(--neon-1)" />
        <StatCard label="Offers" value={stats.offers} accent="var(--neon-3)" />
        <StatCard label="Rejected" value={stats.rejected} accent="#ef4444" />
        <StatCard label="New this week" value={stats.weekNew} accent="var(--neon-2)" />
      </div>

      {/* Filters */}
      <div className="panel p-4 mt-6">
        <div className="grid md:grid-cols-5 gap-3">
          <input
            className="px-3 py-2 md:col-span-2"
            placeholder="Search company, role, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="px-3 py-2" value={stageFilter} onChange={(e) => setStageFilter(e.target.value as any)}>
            <option>All</option>
            <option>Applied</option>
            <option>Screen</option>
            <option>Interview</option>
            <option>Offer</option>
            <option>Rejected</option>
          </select>
          <select className="px-3 py-2" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)}>
            <option>All</option>
            <option>LinkedIn</option>
            <option>Company</option>
            <option>Referral</option>
            <option>Other</option>
          </select>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setSortBy('appliedAt')}
              aria-pressed={sortBy === 'appliedAt'}
            >
              Sort by Date
            </button>
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setSortBy('stage')}
              aria-pressed={sortBy === 'stage'}
            >
              Sort by Stage
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              title="Toggle sort direction"
            >
              {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Applications list */}
        <div className="lg:col-span-2 card p-6">
          <div className="section-header">
            <h2 className="text-xl font-bold">Applications</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-muted)] border-b">
                  <th className="py-2">Company</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Location</th>
                  <th className="py-2">Stage</th>
                  <th className="py-2">Applied</th>
                  <th className="py-2">Source</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b hover:border-[var(--neon-1)] transition">
                    <td className="py-3 font-medium">{a.company}</td>
                    <td className="py-3">{a.role}</td>
                    <td className="py-3">{a.location}</td>
                    <td className="py-3">
                      <StageBadge stage={a.stage} />
                    </td>
                    <td className="py-3">{new Date(a.appliedAt).toLocaleDateString()}</td>
                    <td className="py-3">{a.source}</td>
                    <td className="py-3">
                      <div className="flex gap-2 justify-end">
                        <button className="btn btn-secondary px-3 py-1">Details</button>
                        <button className="btn px-3 py-1">Update</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="py-6 text-[var(--text-muted)]" colSpan={7}>
                      No applications match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pipeline + Alerts */}
        <aside className="space-y-6">
          <div className="panel p-6">
            <div className="section-header">
              <h2 className="text-xl font-bold">Pipeline</h2>
            </div>
            <Pipeline visualizationFrom={applications} />
          </div>

          <div className="panel p-6">
            <div className="section-header">
              <h2 className="text-xl font-bold">Alerts</h2>
            </div>
            <ul className="space-y-3">
              {alerts.map((al) => (
                <li key={al.id} className="rounded-md border p-3 hover:shadow-neon transition">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{al.title}</div>
                    <small className="text-[var(--text-muted)]">{new Date(al.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div className="mt-1 text-[var(--text-muted)]">{al.message}</div>
                  <div className="mt-2">
                    <SeverityBadge severity={al.severity} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* Components remain the same */

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[var(--text-muted)] text-xs">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: Application['stage'] }) {
  const map: Record<Application['stage'], { bg: string; txt: string }> = {
    Applied: { bg: 'rgba(167,139,250,0.12)', txt: '#a78bfa' },
    Screen: { bg: 'rgba(122,240,255,0.12)', txt: '#7af0ff' },
    Interview: { bg: 'rgba(139,92,255,0.12)', txt: '#8b5cff' },
    Offer: { bg: 'rgba(0,255,163,0.12)', txt: '#00FFA3' },
    Rejected: { bg: 'rgba(239,68,68,0.12)', txt: '#ef4444' },
  };
  const style = map[stage];
  return (
    <span
      className="px-2 py-1 rounded text-xs font-semibold"
      style={{ background: style.bg, color: style.txt, border: `1px solid ${style.txt}20` }}
    >
      {stage}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Alert['severity'] }) {
  const map: Record<Alert['severity'], { bg: string; txt: string; label: string }> = {
    info: { bg: 'rgba(122,240,255,0.12)', txt: '#7af0ff', label: 'Info' },
    warning: { bg: 'rgba(234,179,8,0.12)', txt: '#eab308', label: 'Reminder' },
    success: { bg: 'rgba(0,255,163,0.12)', txt: '#00FFA3', label: 'Success' },
  };
  const style = map[severity];
  return (
    <span
      className="px-2 py-1 rounded text-xs font-semibold"
      style={{ background: style.bg, color: style.txt, border: `1px solid ${style.txt}20` }}
    >
      {style.label}
    </span>
  );
}

function Pipeline({ visualizationFrom }: { visualizationFrom: Application[] }) {
  const stages: Application['stage'][] = ['Applied', 'Screen', 'Interview', 'Offer', 'Rejected'];
  const counts = stages.map((s) => visualizationFrom.filter((a) => a.stage === s).length);
  const max = Math.max(...counts, 1);
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const val = counts[i];
        const pct = Math.round((val / max) * 100);
        const gradient =
          s === 'Offer'
            ? 'linear-gradient(90deg, var(--neon-3), var(--neon-1))'
            : s === 'Interview'
            ? 'linear-gradient(90deg, var(--neon-2), var(--neon-1))'
            : s === 'Screen'
            ? 'linear-gradient(90deg, var(--neon-1), var(--neon-2))'
            : s === 'Applied'
            ? 'linear-gradient(90deg, #a78bfa, var(--neon-2))'
            : 'linear-gradient(90deg, #ef4444, #f97316)';
        return (
          <div key={s} className="rounded-md border p-3 hover:shadow-neon transition">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{s}</div>
              <div className="text-xs text-[var(--text-muted)]">{val}</div>
            </div>
            <div className="h-2 rounded-full bg-black/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: gradient, boxShadow: '0 0 20px rgba(122,240,255,0.20)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function stageIndex(stage: Application['stage']) {
  return ['Applied', 'Screen', 'Interview', 'Offer', 'Rejected'].indexOf(stage);
}