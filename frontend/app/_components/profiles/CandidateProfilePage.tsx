// frontend/app/_components/profiles/CandidateProfilePage.tsx
'use client';

import { Suspense } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/components/providers/AuthProvider';
import { useMyApplications, useAlerts, type ApplicationStatus } from '@/hooks/useRealTimeAlerts';
import { useCandidateProfile } from '@/hooks/userProfile';
import { useProfilePanel } from '@/components/context/ProfilePanelContext';
import { ProfilePanel } from '@/components/profile/ProfilePanel';
import Link from 'next/link';

const C = {
  bg: '#070B14',
  surface: '#0D1424',
  border: 'rgba(255,255,255,0.07)',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.3)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  green: '#34D399',
  teal: '#10B981',
  amber: '#FBBF24',
  red: '#F87171',
  blue: '#60A5FA',
  pink: '#F472B6',
} as const;

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied: { bg: 'bg-[rgba(96,165,250,0.1)]', color: 'text-[#60A5FA]', label: 'Applied' },
  reviewed: { bg: 'bg-[rgba(251,191,36,0.1)]', color: 'text-[#FBBF24]', label: 'Reviewed' },
  reviewing: { bg: 'bg-[rgba(251,191,36,0.1)]', color: 'text-[#FBBF24]', label: 'Reviewing' },
  shortlisted: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', label: 'Shortlisted' },
  interview: { bg: 'bg-[rgba(167,139,250,0.1)]', color: 'text-[#A78BFA]', label: 'Interview' },
  offered: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', label: 'Offered' },
  rejected: { bg: 'bg-[rgba(248,113,113,0.1)]', color: 'text-[#F87171]', label: 'Rejected' },
  hired: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', label: 'Hired' },
};

function Pulse({ h = 14, w = '100%' }: { h?: number; w?: number | string }) {
  return <div style={{ height: h, width: w, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />;
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.12)] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-[rgba(226,232,240,0.68)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-start gap-4 hover:border-[rgba(255,255,255,0.12)] transition-all">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0`} style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[rgba(226,232,240,0.5)] uppercase tracking-wider font-bold">{label}</p>
        {loading ? <Pulse h={28} w={60} /> : (
          <p className="text-2xl font-bold font-mono leading-none mt-1" style={{ color }}>{value}</p>
        )}
        {sub && <p className="text-[11px] text-[rgba(226,232,240,0.3)] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function CompletionRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div className="relative w-[68px] h-[68px] flex-shrink-0">
      <svg width="68" height="68" className="transform -rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold font-mono leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] text-[rgba(226,232,240,0.3)]">%</span>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { openPanel } = useProfilePanel();
  const { data: profile } = useCandidateProfile();
  const { applications, loading } = useMyApplications();
  const { unreadCount = 0 } = useAlerts();

  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalApps = applications.length;
  const shortlisted = (statusCounts.shortlisted ?? 0) + (statusCounts.interview ?? 0);
  const interviews = statusCounts.interview ?? 0;
  const offers = (statusCounts.offered ?? 0) + (statusCounts.hired ?? 0);
  const activeApps = totalApps - (statusCounts.rejected ?? 0);

  const appsByDay = (() => {
    const map: Record<string, number> = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      map[d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })] = 0;
    }
    applications.forEach(a => {
      const key = new Date(a.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  })();

  const statusDist = Object.entries(statusCounts).map(([status, count]) => ({
    status, count,
    color: STATUS_META[status as ApplicationStatus]?.color ?? C.muted,
  }));

  const funnelRows = [
    { stage: 'Applied', value: totalApps, color: C.blue },
    { stage: 'Active', value: activeApps, color: C.sky },
    { stage: 'Shortlisted', value: shortlisted, color: C.purple },
    { stage: 'Interview', value: interviews, color: C.amber },
    { stage: 'Offer', value: offers, color: C.green },
  ];

  const completionScore = profile?.profileCompletion ?? 0;
  const topSkills = (profile?.topSkills ?? []) as string[];
  const greeting = profile?.headline
    ? `Hey, ${(profile.full_name ?? profile.headline).split(' ')[0]}`
    : `Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`;

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] p-6 md:p-10 overflow-y-auto flex-1">
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
            <p className="text-sm text-[rgba(226,232,240,0.5)] mt-1">
              {totalApps} applications tracked ·{' '}
              {unreadCount > 0 ? <span className="text-[#A78BFA]">{unreadCount} new alerts</span> : <span>all caught up ✓</span>}
            </p>
          </div>
          
          <button
            onClick={openPanel}
            className="flex items-center gap-4 p-4 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0D1424] hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer"
          >
            <CompletionRing score={completionScore} />
            <div className="text-left">
              <p className="text-sm font-semibold text-[#E2E8F0]">Profile {completionScore}% complete</p>
              <p className="text-[11px] mt-0.5" style={{ color: completionScore < 60 ? C.amber : C.muted }}>
                {completionScore < 60 ? 'Complete to unlock better AI matches →' : completionScore < 90 ? 'Almost done — click to finish →' : 'Profile looks great ✓'}
              </p>
            </div>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Applied" value={totalApps} color={C.blue} icon="📋" loading={loading} />
          <KpiCard label="Active" value={activeApps} color={C.sky} icon="⚡" loading={loading} sub="not rejected" />
          <KpiCard label="Interviews" value={interviews} color={C.amber} icon="🎯" loading={loading} />
          <KpiCard label="Offers" value={offers} color={C.green} icon="🎉" loading={loading} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#E2E8F0] mb-6">Application Activity — last 14 days</p>
            {loading ? <Pulse h={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={appsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.sky} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.sky} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="count" name="Applications" stroke={C.sky} strokeWidth={2} fill="url(#cGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Donut */}
          <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#E2E8F0] mb-6">By Status</p>
            {statusDist.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-xs text-[rgba(226,232,240,0.3)] text-center">Apply to jobs<br />to see breakdown</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="count" nameKey="status">
                      {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {statusDist.map(s => (
                    <span key={s.status} className="text-[10px] text-[rgba(226,232,240,0.5)] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Funnel */}
          <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#E2E8F0] mb-6">Hiring Funnel</p>
            {totalApps === 0 ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-xs text-[rgba(226,232,240,0.3)] text-center">Apply to jobs<br />to see your pipeline</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {funnelRows.map(row => {
                  const pct = totalApps > 0 ? Math.round((row.value / totalApps) * 100) : 0;
                  return (
                    <div key={row.stage}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: row.color }}>{row.stage}</span>
                        <span className="text-[11px] text-[rgba(226,232,240,0.5)] font-mono">{row.value} <span className="text-[rgba(226,232,240,0.3)]">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: row.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
            <p className="text-sm font-semibold text-[#E2E8F0] mb-6">Your Top Skills</p>
            {topSkills.length === 0 ? (
              <div className="h-[180px] flex flex-col items-center justify-center gap-3">
                <span className="text-3xl">📄</span>
                <p className="text-xs text-[rgba(226,232,240,0.3)] text-center leading-relaxed">Upload & analyse your resume<br />to see skill insights</p>
                <button onClick={openPanel} className="text-xs text-[#38BDF8] border border-[rgba(56,189,248,0.2)] bg-[rgba(56,189,248,0.05)] rounded-lg px-3 py-1.5 hover:bg-[rgba(56,189,248,0.1)] transition-colors">
                  Open Profile →
                </button>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {topSkills.slice(0, 12).map((s, i) => (
                    <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] text-[#A78BFA] font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
                {profile?.experienceLevel && (
                  <p className="text-xs text-[rgba(226,232,240,0.5)]">
                    <span className="text-[#38BDF8] font-semibold">{profile.experienceLevel}</span>
                    {profile.experienceYears != null && ` · ${profile.experienceYears} years experience`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/resume-analysis" className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.12)] transition-all group">
            <div className="text-2xl mb-2">🧠</div>
            <p className="text-sm font-semibold text-[#E2E8F0] group-hover:text-[#F8FAFC] transition-colors">Resume Analysis</p>
            <p className="text-[11px] text-[rgba(226,232,240,0.5)] mt-1">Analyse your latest resume</p>
          </Link>
          <Link href="/recommendations" className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.12)] transition-all group">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-sm font-semibold text-[#E2E8F0] group-hover:text-[#F8FAFC] transition-colors">Recommendations</p>
            <p className="text-[11px] text-[rgba(226,232,240,0.5)] mt-1">AI-matched jobs for you</p>
          </Link>
          <Link href="/saved-jobs" className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.12)] transition-all group">
            <div className="text-2xl mb-2">🔖</div>
            <p className="text-sm font-semibold text-[#E2E8F0] group-hover:text-[#F8FAFC] transition-colors">Saved Jobs</p>
            <p className="text-[11px] text-[rgba(226,232,240,0.5)] mt-1">Your bookmarked roles</p>
          </Link>
          <Link href="/mock-interview" className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.12)] transition-all group">
            <div className="text-2xl mb-2">🎤</div>
            <p className="text-sm font-semibold text-[#E2E8F0] group-hover:text-[#F8FAFC] transition-colors">Mock Interview</p>
            <p className="text-[11px] text-[rgba(226,232,240,0.5)] mt-1">Practice with AI</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
          <p className="text-sm font-semibold text-[#E2E8F0] mb-6">Recent Activity</p>
          {applications.length === 0 ? (
            <p className="text-sm text-[rgba(226,232,240,0.3)] text-center py-8">No activity yet — apply to jobs to see updates here</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...applications]
                .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
                .slice(0, 8)
                .map(app => {
                  const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                  return (
                    <div key={app.id} className="flex items-center gap-4 p-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.1)] transition-all">
                      <span className="text-lg flex-shrink-0">📋</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#E2E8F0] truncate">{(app as any).jobs?.title ?? 'Job Application'}</p>
                        <p className="text-[11px] text-[rgba(226,232,240,0.5)] mt-0.5">
                          {(app as any).jobs?.company ?? ''} · {new Date(app.applied_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <ProfilePanel />
    </div>
  );
}

export default function CandidateProfilePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070B14] font-sans text-[#F8FAFC]">
      <Suspense fallback={<div className="p-8 text-[rgba(226,232,240,0.3)] text-sm">Loading dashboard…</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}