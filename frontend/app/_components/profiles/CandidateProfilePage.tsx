/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/dashboard/page.tsx  —  Candidate Command Center
//
// Architecture mirrors the recruiter dashboard exactly:
//   • Header with live indicator + profile button
//   • Tabs: Overview | Applications | Skills
//   • Power BI-style KPI row with real-time data
//   • Area chart: 14-day application activity
//   • Donut chart: pipeline status breakdown
//   • Funnel bars: conversion from applied → offer
//   • Skills grid: from resume AI analysis
//   • Recent activity feed with status badges
//   • ProfilePanel drawer wired via ProfilePanelContext
//
// CRITICAL FIX: import path is '@/components/context/ProfilePanelContext'
// NOT '@/context/ProfilePanelContext' — the latter resolves to a different
// module instance, breaking the context provider/consumer relationship.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, Suspense } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth }             from '@/components/providers/AuthProvider';
import {
  useMyApplications,
  useAlerts,
  useRecommendations,
  useResumeAnalysis,
  useLatestResume,
  type ApplicationStatus,
} from '@/hooks/useRealTimeAlerts';
import { useCandidateProfile } from '@/hooks/userProfile';
import { useProfilePanel }     from '@/components/context/ProfilePanelContext'; // ← CORRECT path
import { ProfilePanel }        from '@/components/profile/ProfilePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#080C14',
  surface: '#0D1220',
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.35)',
  faint:   'rgba(255,255,255,0.2)',
  sky:     '#38BDF8',
  purple:  '#A78BFA',
  green:   '#10B981',
  teal:    '#34D399',
  amber:   '#FBBF24',
  red:     '#F87171',
  blue:    '#60A5FA',
  pink:    '#F472B6',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Status metadata
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.1)',  color: C.blue,   label: 'Applied'     },
  reviewed:    { bg: 'rgba(251,191,36,0.1)',  color: C.amber,  label: 'Reviewed'    },
  reviewing:   { bg: 'rgba(251,191,36,0.1)',  color: C.amber,  label: 'Reviewing'   },
  shortlisted: { bg: 'rgba(52,211,153,0.1)',  color: C.teal,   label: 'Shortlisted' },
  interview:   { bg: 'rgba(167,139,250,0.1)', color: C.purple, label: 'Interview'   },
  offered:     { bg: 'rgba(52,211,153,0.15)', color: C.green,  label: 'Offered'     },
  rejected:    { bg: 'rgba(248,113,113,0.1)', color: C.red,    label: 'Rejected'    },
  hired:       { bg: 'rgba(52,211,153,0.2)',  color: '#059669',label: 'Hired'       },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared style helpers
// ─────────────────────────────────────────────────────────────────────────────

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface,
  border:     `1px solid ${C.border}`,
  borderRadius: 14,
  ...extra,
});

// ─────────────────────────────────────────────────────────────────────────────
// Chart tooltip  (matches recruiter dashboard style exactly)
// ─────────────────────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: C.muted, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card  (identical structure to recruiter KpiCard)
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <div style={{ height: 28, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 4, animation: 'cdPulse 1.4s ease infinite' }} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.faint }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile completion ring
// ─────────────────────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.faint }}>%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Overview — KPIs + charts
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({ openPanel }: { openPanel: () => void }) {
  const { data: profile }         = useCandidateProfile();
  const { applications, loading } = useMyApplications();

  // Derive all analytics from live data — no mock data
  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalApps   = applications.length;
  const activeApps  = totalApps - (statusCounts.rejected ?? 0);
  const shortlisted = (statusCounts.shortlisted ?? 0) + (statusCounts.interview ?? 0);
  const interviews  = statusCounts.interview ?? 0;
  const offers      = (statusCounts.offered ?? 0) + (statusCounts.hired ?? 0);
  const responseRate = totalApps > 0 ? Math.round(((totalApps - (statusCounts.applied ?? 0)) / totalApps) * 100) : 0;

  // 14-day daily application chart
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

  // Status donut
  const statusDist = Object.entries(statusCounts).map(([status, count]) => ({
    status, count,
    color: STATUS_META[status as ApplicationStatus]?.color ?? C.muted,
  }));

  // Funnel data
  const funnelData = [
    { stage: 'Applied',     value: totalApps,   color: C.blue   },
    { stage: 'Active',      value: activeApps,  color: C.sky    },
    { stage: 'Shortlisted', value: shortlisted, color: C.purple },
    { stage: 'Interview',   value: interviews,  color: C.amber  },
    { stage: 'Offer',       value: offers,      color: C.green  },
  ];

  const completionScore = profile?.profileCompletion ?? 0;

  return (
    <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', animation: 'cdFade 0.3s ease' }}>

      {/* ── Profile completion nudge ── */}
      {completionScore < 100 && (
        <button
          onClick={openPanel}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', marginBottom: '1.5rem',
            background: completionScore < 60 ? 'rgba(251,191,36,0.05)' : 'rgba(56,189,248,0.05)',
            border: `1px solid ${completionScore < 60 ? C.amber + '44' : C.sky + '33'}`,
            borderRadius: 12, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            transition: 'all 0.15s', textAlign: 'left',
          }}
        >
          <CompletionRing score={completionScore} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
              Profile {completionScore}% complete
            </p>
            <p style={{ margin: 0, fontSize: 12, color: completionScore < 60 ? C.amber : C.muted }}>
              {completionScore < 60
                ? '⚠ Complete your profile to unlock better AI job matches →'
                : 'Almost done — click to finish your profile →'}
            </p>
          </div>
          <span style={{ fontSize: 18, color: C.muted, flexShrink: 0 }}>→</span>
        </button>
      )}

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <KpiCard label="Total Applied"  value={totalApps}   color={C.blue}   icon="📋" loading={loading} />
        <KpiCard label="Active"         value={activeApps}  color={C.sky}    icon="⚡" loading={loading} sub="not rejected" />
        <KpiCard label="Interviews"     value={interviews}  color={C.amber}  icon="🎯" loading={loading} />
        <KpiCard label="Shortlisted"    value={shortlisted} color={C.purple} icon="⭐" loading={loading} />
        <KpiCard label="Offers"         value={offers}      color={C.green}  icon="🎉" loading={loading} />
        <KpiCard label="Response Rate"  value={`${responseRate}%`} color={C.teal} icon="📈" loading={loading} sub="applications with activity" />
      </div>

      {/* ── Charts row 1: area + donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
            Application Activity — last 14 days
          </p>
          {loading ? (
            <div style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 8, animation: 'cdPulse 1.4s ease infinite' }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={appsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.sky} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.sky} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Applications" stroke={C.sky} strokeWidth={2} fill="url(#cdGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {statusDist.length === 0 && !loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see breakdown</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="status">
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
                {statusDist.map(s => (
                  <span key={s.status} style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                    {s.status} ({s.count})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Charts row 2: funnel + bar chart of weekly activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Hiring Funnel</p>
          {totalApps === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: C.faint, textAlign: 'center' }}>No applications yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnelData.map(row => {
                const pct = totalApps > 0 ? Math.round((row.value / totalApps) * 100) : 0;
                return (
                  <div key={row.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.stage}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {row.value} <span style={{ color: C.faint }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: row.color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Weekly Applications</p>
          {appsByDay.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: C.faint }}>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={appsByDay.slice(-7)} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Applied" fill={C.purple} radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent applications feed ── */}
      <div style={card({ padding: '1.25rem 1.5rem' })}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Applications</p>
        {applications.length === 0 && !loading ? (
          <p style={{ fontSize: 13, color: C.faint, margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
            No applications yet — apply to jobs to see activity here
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...applications]
              .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
              .slice(0, 8)
              .map(app => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                const fmtDate = (iso: string) =>
                  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${C.purple}18`, color: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {((app as any).jobs?.company ?? 'J').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        {(app as any).jobs?.title ?? 'Job Application'}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: C.faint }}>
                        {(app as any).jobs?.company ?? ''} · {fmtDate(app.applied_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, flexShrink: 0 }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Skills — resume analysis insights
// ─────────────────────────────────────────────────────────────────────────────

function SkillsTab({ openPanel }: { openPanel: () => void }) {
  const { data: profile }              = useCandidateProfile();
  const { recommendations, loading }   = useRecommendations();
  const { resume: latestResume }       = useLatestResume();
  //useResumeAnalysis needs the resume ID — source from useLatestResume,
  // NOT from CandidateProfile which doesn't carry resume IDs
  const { analysis }                   = useResumeAnalysis(latestResume?.id ?? null);

  // topSkills lives on CandidateProfile (populated by the analysis background job)
  const topSkills    = (profile?.topSkills ?? []) as string[];
  // industryTags lives on ResumeAnalysis model, NOT on CandidateProfile
  const industryTags = (analysis?.industryTags ?? []) as string[];

  return (
    <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', animation: 'cdFade 0.3s ease' }}>

      {topSkills.length === 0 ? (
        <div style={card({ padding: '3rem 2rem', textAlign: 'center' })}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>📄</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>
            No skills detected yet
          </p>
          <p style={{ fontSize: 13, color: C.faint, margin: '0 0 20px' }}>
            Upload and analyse your resume to see AI-extracted skill insights
          </p>
          <button onClick={openPanel} style={{ padding: '10px 24px', background: `${C.sky}18`, border: `1px solid ${C.sky}44`, borderRadius: 10, color: C.sky, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
            Open Profile &amp; Upload Resume →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* AI snapshot */}
          {profile?.currentTitle && (
            <div style={card({ padding: '1.25rem 1.5rem', display: 'flex', gap: 14, alignItems: 'flex-start', border: `1px solid ${C.sky}22`, background: `${C.sky}06` })}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🤖</span>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: C.sky, fontWeight: 600 }}>AI Resume Analysis</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{profile.currentTitle}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>
                  {profile.currentCompany ? `at ${profile.currentCompany} · ` : ''}
                  {profile.experienceLevel ?? ''}{profile.experienceYears != null ? ` · ${profile.experienceYears}y exp` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Skills grid */}
          <div style={card({ padding: '1.25rem 1.5rem' })}>
            <p style={{ margin: '0 0 1rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
              Top Skills <span style={{ fontSize: 11, color: C.faint, fontWeight: 400 }}>— from resume analysis</span>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topSkills.map((s, i) => (
                <span key={s} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: `${C.purple}15`, border: `1px solid ${C.purple}${i < 3 ? '55' : '28'}`, color: C.purple, fontWeight: i < 3 ? 700 : 400 }}>
                  {i < 3 && <span style={{ marginRight: 4 }}>★</span>}{s}
                </span>
              ))}
            </div>
          </div>

          {/* Industry tags */}
          {industryTags.length > 0 && (
            <div style={card({ padding: '1.25rem 1.5rem' })}>
              <p style={{ margin: '0 0 1rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Industry Fit</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {industryTags.map(t => (
                  <span key={t} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: `${C.teal}12`, border: `1px solid ${C.teal}30`, color: C.teal }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended jobs from AI */}
          {(recommendations.length > 0 || loading) && (
            <div style={card({ padding: '1.25rem 1.5rem' })}>
              <p style={{ margin: '0 0 1rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>AI Job Recommendations</p>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'cdPulse 1.4s ease infinite' }} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recommendations.slice(0, 5).map(job => (
                    <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{job.title}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: C.faint }}>{job.company} · {job.location}</p>
                      </div>
                      {job.matchScore != null && job.matchScore > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${C.green}15`, color: C.green, border: `1px solid ${C.green}30`, flexShrink: 0 }}>
                          {job.matchScore}% match
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard component
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'applications' | 'skills';

function DashboardContent() {
  const { user }                       = useAuth();
  const { openPanel }                  = useProfilePanel();
  const { data: profile }              = useCandidateProfile();
  const { applications, loading }      = useMyApplications();
  const { unreadCount = 0 }            = useAlerts();
  const [tab, setTab]                  = useState<Tab>('overview');

  const totalApps = applications.length;
  const offers    = (
    (applications.filter(a => a.status === 'offered').length) +
    (applications.filter(a => a.status === 'hired').length)
  );

  // full_name lives on User (from useAuth), NOT on CandidateProfile
  const greeting = user?.full_name
    ? `Hey, ${user.full_name.split(' ')[0]}`
    : user?.email?.split('@')[0]
    ? `Hey, ${user.email.split('@')[0]}`
    : 'Dashboard';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',      label: '📊 Overview'     },
    { key: 'applications',  label: '📋 Applications' },
    { key: 'skills',        label: '🧠 Skills & AI'  },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Sora', sans-serif", color: '#E2E8F0', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes cdPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes cdFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      {/* ── Header — identical structure to recruiter ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '1.25rem 2rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                {greeting}
              </h1>
              {/* Live indicator — pulses when SWR is revalidating */}
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: loading ? C.teal : 'rgba(52,211,153,0.3)',
                boxShadow:  loading ? `0 0 5px ${C.teal}` : 'none',
                transition: 'background 0.3s', display: 'inline-block',
              }} title="Live — refreshes every 30s" />
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>
              {totalApps} applications ·{' '}
              {offers > 0
                ? <span style={{ color: C.green }}>{offers} offer{offers > 1 ? 's' : ''} 🎉</span>
                : 'keep applying'
              }
              {unreadCount > 0 && (
                <span style={{ color: C.purple }}> · {unreadCount} new alert{unreadCount > 1 ? 's' : ''}</span>
              )}
              {' · live'}
            </p>
          </div>

          {/* Profile & Settings button — same position as recruiter */}
          <button
            onClick={openPanel}
            style={{
              padding: '9px 16px',
              background: `${C.sky}08`,
              border:     `1px solid ${C.sky}28`,
              borderRadius: 10,
              color:        C.sky,
              fontSize:     12,
              fontWeight:   600,
              cursor:       'pointer',
              fontFamily:   'Sora, sans-serif',
              transition:   'all 0.15s',
            }}
          >
            ⚙ Profile &amp; Settings
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding:    '7px 18px',
                borderRadius: 7,
                fontSize:   12,
                fontWeight: tab === key ? 700 : 400,
                background: tab === key ? `${C.sky}22` : 'transparent',
                color:      tab === key ? C.sky : C.muted,
                border:     tab === key ? `1px solid ${C.sky}44` : '1px solid transparent',
                cursor:     'pointer',
                fontFamily: 'Sora, sans-serif',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview'     && <OverviewTab openPanel={openPanel} />}
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'skills'       && <SkillsTab openPanel={openPanel} />}

      {/* ProfilePanel drawer — opened by header button or Sidebar username card */}
      <ProfilePanel />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Applications — full list with status management
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationsTab() {
  const { applications, loading } = useMyApplications();

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', animation: 'cdFade 0.3s ease' }}>
      <div style={card({ padding: '1.25rem 1.5rem' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>All Applications</p>
          <span style={{ fontSize: 12, color: C.muted }}>{applications.length} total</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'cdPulse 1.4s ease infinite' }} />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: C.faint, margin: 0 }}>No applications yet — head to Jobs to start applying</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...applications]
              .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
              .map(app => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `${C.purple}18`, color: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {((app as any).jobs?.company ?? 'J').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                        {(app as any).jobs?.title ?? 'Job Application'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: C.faint }}>
                        {(app as any).jobs?.company ?? ''} · Applied {fmtDate(app.applied_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}35`, flexShrink: 0 }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'Sora, sans-serif' }}>
        Loading dashboard…
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}