'use client';

import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { useCandidateAnalytics } from '@/hooks/useAnalytics';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: 14,
      background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading ? (
          <div style={{ height: 28, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 4, animation: 'caPulse 1.4s ease infinite' }} />
        ) : (
          <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        )}
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, span }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: 14,
      background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)',
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{title}</p>
      {children}
    </div>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  applied:    '📋', viewed: '👁️', shortlisted: '⭐',
  interview:  '🎯', offer: '🎉', rejected: '❌', default: '🔔',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function CandidateAnalytics() {
  const { analytics, loading } = useCandidateAnalytics();
  const {
    kpis, applicationsByStatus, activityOverTime,
    skillMatch, recentActivity, applicationFunnel,
  } = analytics;

  return (
    <>
      <style>{`
        @keyframes caPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes caFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ padding: '1.5rem 2rem', animation: 'caFade 0.3s ease' }}>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
          <KpiCard label="Applications Sent"  value={kpis.totalApplications} color="#A78BFA" icon="📤" loading={loading} />
          <KpiCard label="Under Review"        value={kpis.underReview}       color="#FBBF24" icon="🔍" loading={loading} />
          <KpiCard label="Interviews"          value={kpis.interviews}        color="#60A5FA" icon="🎯" loading={loading} />
          <KpiCard label="Offers Received"     value={kpis.offers}            color="#10B981" icon="🎉" loading={loading} />
          <KpiCard label="Profile Views"       value={kpis.profileViews}      color="#F472B6" icon="👁️" loading={loading} />
          <KpiCard
            label="Match Score"
            value={kpis.matchScore ? `${kpis.matchScore}%` : '—'}
            color="#34D399" icon="✨"
            sub="avg across applied jobs"
            loading={loading}
          />
        </div>

        {/* ── Charts Row 1 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Activity over time */}
          <ChartCard title="Application Activity">
            {activityOverTime.length === 0 && !loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No activity yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#A78BFA" strokeWidth={2} fill="url(#appsGrad)" />
                  <Area type="monotone" dataKey="views"        name="Profile Views" stroke="#60A5FA" strokeWidth={2} fill="url(#viewsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Application status donut */}
          <ChartCard title="Status Breakdown">
            {applicationsByStatus.length === 0 && !loading ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={applicationsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="count" nameKey="status">
                      {applicationsByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {applicationsByStatus.map(s => (
                    <span key={s.status} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>

        {/* ── Charts Row 2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Application funnel */}
          <ChartCard title="Application Pipeline Funnel">
            {applicationFunnel.length === 0 && !loading ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {applicationFunnel.map((stage, i) => {
                  const max = applicationFunnel[0]?.count || 1;
                  const pct = Math.round((stage.count / max) * 100);
                  const colors = ['#A78BFA', '#60A5FA', '#FBBF24', '#34D399', '#10B981', '#F472B6'];
                  return (
                    <div key={stage.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{stage.stage}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{stage.count}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{
                          height: '100%', borderRadius: 4, width: `${pct}%`,
                          background: colors[i % colors.length],
                          transition: 'width 0.6s ease',
                          opacity: 1 - i * 0.1,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          {/* Skill match radar-style bars */}
          <ChartCard title="Your Skills vs Job Requirements">
            {skillMatch.length === 0 && !loading ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No skill data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={skillMatch} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="have"     name="Your Level"  fill="#A78BFA" radius={[0, 3, 3, 0]} barSize={6} />
                  <Bar dataKey="required" name="Required"    fill="rgba(255,255,255,0.1)" radius={[0, 3, 3, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Recent Activity ── */}
        <ChartCard title="Recent Activity">
          {recentActivity.length === 0 && !loading ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
              No recent activity
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentActivity.slice(0, 8).map((a) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {ACTIVITY_ICONS[a.type] ?? ACTIVITY_ICONS.default}
                  </span>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{a.message}</p>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{timeAgo(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
}