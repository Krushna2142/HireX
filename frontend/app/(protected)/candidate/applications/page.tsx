'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/candidate/applications/page.tsx

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';

import api from '@/lib/axios';

type CandidateApplication = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  applied_at?: string | null;
  appliedAt?: string | null;
  match_score?: number | null;
  ats_score?: number | null;
  ats_recommendation?: string | null;
  job?: {
    id?: string;
    title?: string | null;
    company?: string | null;
    companyName?: string | null;
    company_name?: string | null;
    location?: string | null;
    workMode?: string | null;
    work_mode?: string | null;
  } | null;
  jobs?: {
    id?: string;
    title?: string | null;
    company?: string | null;
    companyName?: string | null;
    company_name?: string | null;
    location?: string | null;
    workMode?: string | null;
    work_mode?: string | null;
  } | null;
};

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
  border: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
};

function safeString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return fallback;
}

function toArray<T>(raw: unknown, key?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  const keys = ['data', 'items', 'results', 'applications', key].filter(Boolean) as string[];

  for (const candidate of keys) {
    const value = obj[candidate];

    if (Array.isArray(value)) return value as T[];

    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;

      if (Array.isArray(nested.data)) return nested.data as T[];
      if (Array.isArray(nested.items)) return nested.items as T[];
      if (Array.isArray(nested.results)) return nested.results as T[];
      if (Array.isArray(nested.applications)) return nested.applications as T[];
    }
  }

  return [];
}

function getErrorMessage(error: unknown, fallback: string) {
  const anyError = error as any;

  return safeString(
    anyError?.response?.data?.detail ??
      anyError?.response?.data?.message ??
      anyError?.response?.data?.error ??
      anyError?.message,
    fallback,
  );
}

function normalizeStatus(status?: string | null) {
  return safeString(status, 'applied').replace(/_/g, ' ').toLowerCase();
}

function statusColor(status?: string | null) {
  const value = normalizeStatus(status);

  if (value.includes('reject') || value.includes('fail')) return C.red;
  if (value.includes('hire') || value.includes('offer')) return C.green;
  if (value.includes('interview') || value.includes('schedule')) return C.purple;
  if (value.includes('shortlist')) return C.yellow;

  return C.sky;
}

function getJob(app: CandidateApplication) {
  return app.job ?? app.jobs ?? null;
}

function getJobTitle(app: CandidateApplication) {
  return safeString(getJob(app)?.title, 'Job');
}

function getCompany(app: CandidateApplication) {
  const job = getJob(app);

  return safeString(
    job?.companyName ?? job?.company_name ?? job?.company,
    'Company',
  );
}

function getLocation(app: CandidateApplication) {
  return safeString(getJob(app)?.location, 'Location not set');
}

function getWorkMode(app: CandidateApplication) {
  const job = getJob(app);

  return safeString(job?.workMode ?? job?.work_mode, 'work mode not set');
}

function getAppliedAt(app: CandidateApplication) {
  return app.applied_at ?? app.appliedAt ?? app.created_at ?? app.createdAt ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getAtsScore(app: CandidateApplication) {
  const score = Number(app.ats_score ?? app.match_score ?? 0);

  return Number.isFinite(score) ? Math.round(score) : 0;
}

export default function CandidateApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/jobs/applications/mine');
      const rows = toArray<CandidateApplication>(data, 'applications').filter(
        (item) => item && typeof item === 'object' && item.id,
      );

      setApplications(rows);
    } catch (err) {
      setApplications([]);
      setError(getErrorMessage(err, 'Unable to load your applications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      shortlisted: applications.filter((app) =>
        normalizeStatus(app.status).includes('shortlist'),
      ).length,
      interviews: applications.filter((app) =>
        normalizeStatus(app.status).includes('interview') ||
        normalizeStatus(app.status).includes('schedule'),
      ).length,
      rejected: applications.filter((app) =>
        normalizeStatus(app.status).includes('reject'),
      ).length,
    };
  }, [applications]);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>My Applications</h1>
          <p style={subtitleStyle}>
            Track your applications, ATS status, shortlist status, and interview progress.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadApplications()}
          style={secondaryButtonStyle}
        >
          Refresh
        </button>
      </header>

      <section style={statsGridStyle}>
        <StatCard label="Total Applied" value={stats.total} color={C.sky} />
        <StatCard label="Shortlisted" value={stats.shortlisted} color={C.yellow} />
        <StatCard label="Interviews" value={stats.interviews} color={C.purple} />
        <StatCard label="Rejected" value={stats.rejected} color={C.red} />
      </section>

      {error && <div style={errorBoxStyle}>{error}</div>}

      {loading ? (
        <section style={panelStyle}>Loading applications...</section>
      ) : applications.length ? (
        <section style={listStyle}>
          {applications.map((app) => {
            const color = statusColor(app.status);
            const atsScore = getAtsScore(app);

            return (
              <article key={app.id} style={cardStyle}>
                <div style={{ flex: 1 }}>
                  <div style={cardTopStyle}>
                    <div>
                      <h2 style={cardTitleStyle}>{getJobTitle(app)}</h2>
                      <p style={mutedStyle}>
                        {getCompany(app)} · {getLocation(app)} · {getWorkMode(app)}
                      </p>
                    </div>

                    <span
                      style={{
                        ...statusPillStyle,
                        color,
                        borderColor: `${color}55`,
                        background: `${color}14`,
                      }}
                    >
                      {normalizeStatus(app.status)}
                    </span>
                  </div>

                  <div style={miniGridStyle}>
                    <div style={miniBoxStyle}>
                      <span>Applied</span>
                      <strong>{formatDate(getAppliedAt(app))}</strong>
                    </div>

                    <div style={miniBoxStyle}>
                      <span>ATS / Match</span>
                      <strong style={{ color: atsScore >= 70 ? C.green : atsScore >= 45 ? C.yellow : C.faint }}>
                        {atsScore ? `${atsScore}%` : 'Pending'}
                      </strong>
                    </div>

                    <div style={miniBoxStyle}>
                      <span>Recommendation</span>
                      <strong>{safeString(app.ats_recommendation, 'Pending')}</strong>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section style={emptyStyle}>
          <strong>No applications yet</strong>
          <p>Apply to jobs and your full tracking journey will appear here.</p>
          <Link href="/jobs" style={primaryLinkStyle}>
            Browse Jobs
          </Link>
        </section>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={statCardStyle}>
      <strong style={{ color }}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: C.bg,
  color: C.text,
  padding: '2rem',
  fontFamily: "'Sora', sans-serif",
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  marginBottom: 18,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 950,
  letterSpacing: '-0.04em',
};

const subtitleStyle: CSSProperties = {
  margin: '6px 0 0',
  color: C.faint,
  fontSize: 13,
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 12,
  marginBottom: 18,
};

const statCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 18,
  padding: '1rem',
  display: 'grid',
  gap: 6,
};

const panelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 18,
  padding: '1.25rem',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
};

const cardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 18,
  padding: '1.1rem',
};

const cardTopStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'flex-start',
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 17,
  fontWeight: 950,
};

const mutedStyle: CSSProperties = {
  margin: '6px 0 0',
  color: C.faint,
  fontSize: 12,
};

const miniGridStyle: CSSProperties = {
  marginTop: 14,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const miniBoxStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 14,
  padding: '0.85rem',
  display: 'grid',
  gap: 4,
  fontSize: 12,
  color: C.faint,
};

const statusPillStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'capitalize',
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '10px 14px',
  background: 'rgba(15,23,42,0.72)',
  color: C.text,
  fontWeight: 850,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const primaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 14,
  padding: '11px 16px',
  color: '#020617',
  fontWeight: 950,
  textDecoration: 'none',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple})`,
};

const errorBoxStyle: CSSProperties = {
  border: '1px solid rgba(248,113,113,0.28)',
  background: 'rgba(248,113,113,0.07)',
  color: '#FCA5A5',
  borderRadius: 16,
  padding: '12px 14px',
  marginBottom: 16,
  fontSize: 13,
  fontWeight: 800,
};

const emptyStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 20,
  padding: '2rem',
  display: 'grid',
  gap: 10,
  color: C.faint,
};