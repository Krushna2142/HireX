/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/dashboard/page.tsx  —  Candidate Command Center
//
// What you see when you log in as a candidate:
//   • KPI row:  Total Applied / Active / Interviews / Offers
//   • Area chart: Application activity (last 14 days, derived from live data)
//   • Donut chart: Status breakdown
//   • Funnel bars: Hiring pipeline conversion
//   • Skills grid: Populated from resume AI analysis
//   • Activity feed: Recent applications with status badges
//
// Profile + Settings drawer:
//   • Opened by clicking the username card in the Sidebar (ProfilePanelContext)
//   • Also opened by the "Complete your profile" nudge card
//   • Rendered by <ProfilePanel /> which reads open state from context
//
// All data is real-time via SWR hooks — no mock data anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense }   from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth }               from '@/components/providers/AuthProvider';
import { useMyApplications, useAlerts, type ApplicationStatus } from '@/hooks/useRealTimeAlerts';
import { useCandidateProfile }   from '@/hooks/userProfile';
import { useProfilePanel }       from '@/components/context/ProfilePanelContext';
import { ProfilePanel }          from '@/components/profile/ProfilePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:     '#070B14',
  surface:'#0D1220',
  border: 'rgba(255,255,255,0.07)',
  muted:  'rgba(255,255,255,0.35)',
  faint:  'rgba(255,255,255,0.18)',
  sky:    '#38BDF8',
  purple: '#A78BFA',
  green:  '#10B981',
  teal:   '#34D399',
  amber:  '#FBBF24',
  red:    '#F87171',
  blue:   '#60A5FA',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Status metadata
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: `${C.blue}18`,   color: C.blue,   label: 'Applied'     },
  reviewed:    { bg: `${C.amber}18`,  color: C.amber,  label: 'Reviewed'    },
  reviewing:   { bg: `${C.amber}18`,  color: C.amber,  label: 'Reviewing'   },
  shortlisted: { bg: `${C.teal}18`,   color: C.teal,   label: 'Shortlisted' },
  interview:   { bg: `${C.purple}18`, color: C.purple, label: 'Interview'   },
  offered:     { bg: `${C.green}20`,  color: C.green,  label: 'Offered'     },
  rejected:    { bg: `${C.red}18`,    color: C.red,    label: 'Rejected'    },
  hired:       { bg: `${C.teal}25`,   color: '#059669',label: 'Hired'       },
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, ...extra,
});

function Pulse({ h = 14, w = '100%' }: { h?: number; w?: number | string }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />;
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: C.muted, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ ...card({ padding: '1.25rem 1.5rem' }), display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <Pulse h={28} w={60} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.faint }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile completion ring (SVG donut)
// ─────────────────────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.faint }}>%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user }                      = useAuth();
  const { openPanel }                 = useProfilePanel();
  const { data: profile }             = useCandidateProfile();
  const { applications, loading }     = useMyApplications();
  const { unreadCount = 0 }           = useAlerts();

  // ── Derive all analytics from live application data ────────────────────────
  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalApps   = applications.length;
  const shortlisted = (statusCounts.shortlisted ?? 0) + (statusCounts.interview ?? 0);
  const interviews  = statusCounts.interview ?? 0;
  const offers      = (statusCounts.offered ?? 0) + (statusCounts.hired ?? 0);
  const activeApps  = totalApps - (statusCounts.rejected ?? 0);

  // Applications per day — last 14 days
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

  // Status donut data
  const statusDist = Object.entries(statusCounts).map(([status, count]) => ({
    status, count,
    color: STATUS_META[status as ApplicationStatus]?.color ?? C.muted,
  }));

  // Funnel
  const funnelRows = [
    { stage: 'Applied',     value: totalApps,   color: C.blue   },
    { stage: 'Active',      value: activeApps,  color: C.sky    },
    { stage: 'Shortlisted', value: shortlisted, color: C.purple },
    { stage: 'Interview',   value: interviews,  color: C.amber  },
    { stage: 'Offer',       value: offers,      color: C.green  },
  ];

  const completionScore = profile?.profileCompletion ?? 0;
  const topSkills       = (profile?.topSkills ?? []) as string[];
  const greeting        = profile?.headline
    ? `Hey, ${(profile.full_name ?? profile.headline).split(' ')[0]}`
    : `Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: C.bg }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── Welcome + profile nudge ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>{greeting}</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {totalApps} applications tracked ·{' '}
            {unreadCount > 0
              ? <span style={{ color: C.purple }}>{unreadCount} new alerts</span>
              : <span>all caught up ✓</span>
            }
          </p>
        </div>

        {/* Clickable profile completeness card → opens profile drawer */}
        <button
          onClick={openPanel}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 18px', cursor: 'pointer',
            ...card({
              border: completionScore < 60
                ? `1px solid ${C.amber}44`
                : `1px solid ${C.border}`,
              background: 'none',
            }),
            transition: 'border-color 0.2s',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          <CompletionRing score={completionScore} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
              Profile {completionScore}% complete
            </p>
            <p style={{ margin: 0, fontSize: 11, color: completionScore < 60 ? C.amber : C.muted }}>
              {completionScore < 60
                ? 'Complete to unlock better AI matches →'
                : completionScore < 90
                ? 'Almost done — click to finish →'
                : 'Profile looks great ✓'}
            </p>
          </div>
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <KpiCard label="Total Applied" value={totalApps}  color={C.blue}   icon="📋" loading={loading} />
        <KpiCard label="Active"        value={activeApps} color={C.sky}    icon="⚡" loading={loading} sub="not rejected" />
        <KpiCard label="Interviews"    value={interviews} color={C.amber}  icon="🎯" loading={loading} />
        <KpiCard label="Offers"        value={offers}     color={C.green}  icon="🎉" loading={loading} />
      </div>

      {/* ── Charts row 1: area chart + donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Application Activity — last 14 days</p>
          {loading ? <Pulse h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={appsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.sky} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.sky} stopOpacity={0}   />
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

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {statusDist.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see breakdown</p>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 8 }}>
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

      {/* ── Charts row 2: funnel + skills ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Hiring Funnel</p>
          {totalApps === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see your pipeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnelRows.map(row => {
                const pct = totalApps > 0 ? Math.round((row.value / totalApps) * 100) : 0;
                return (
                  <div key={row.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.stage}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{row.value} <span style={{ color: C.faint }}>({pct}%)</span></span>
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
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Your Top Skills</p>
          {topSkills.length === 0 ? (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>📄</span>
              <p style={{ fontSize: 12, color: C.faint, margin: 0, textAlign: 'center' }}>Upload &amp; analyse your resume<br />to see skill insights</p>
              <button onClick={openPanel} style={{ fontSize: 12, color: C.sky, background: 'none', border: `1px solid ${C.sky}33`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Open Profile →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {topSkills.slice(0, 12).map((s, i) => (
                  <span key={s} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: `${C.purple}15`, border: `1px solid ${C.purple}33`, color: C.purple, fontWeight: i < 3 ? 700 : 400 }}>{s}</span>
                ))}
              </div>
              {profile?.experienceLevel && (
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  <span style={{ color: C.sky, fontWeight: 600 }}>{profile.experienceLevel}</span>
                  {profile.experienceYears != null && ` · ${profile.experienceYears} years experience`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity feed ── */}
      <div style={card({ padding: '1.25rem 1.5rem' })}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Activity</p>
        {applications.length === 0 ? (
          <p style={{ fontSize: 13, color: C.faint, margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
            No activity yet — apply to jobs to see updates here
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...applications]
              .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
              .slice(0, 8)
              .map(app => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
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
// Page export
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070B14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>
      <Suspense fallback={<div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading dashboard…</div>}>
        <DashboardContent />
      </Suspense>

      {/* Profile + Settings drawer — opened by sidebar username card or profile nudge */}
      <ProfilePanel />
    </div>
  );
}