// components/recommendations/JobRecommendations.tsx
'use client';

import { useEffect, useState } from 'react';

interface LiveJob {
  id:          string;
  title:       string;
  company:     string;
  location:    string;
  description: string;
  applyUrl:    string | null;
  postedAt:    string | null;
  salary:      string | null;
  jobType:     string | null;
  source:      'google' | 'db';
}

interface Props {
  layout?: 'sidebar' | 'grid';  // sidebar = compact dark, grid = full page
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchRecs(): Promise<LiveJob[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res   = await fetch(`${API}/jobs/recommendations`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load recommendations');
  return res.json() as Promise<LiveJob[]>;
}

// ── Match score pill (derived from source) ────────────────────────────────────
// DB jobs are recruiter-posted and skill-matched = higher confidence
// Live Google jobs = broader matches

function MatchBadge({ source }: { source: 'google' | 'db' }) {
  const isDb    = source === 'db';
  const label   = isDb ? 'Featured' : 'Live';
  const color   = isDb ? '#A78BFA' : '#60A5FA';
  const bg      = isDb ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)';
  const border  = isDb ? 'rgba(167,139,250,0.25)' : 'rgba(96,165,250,0.25)';

  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px',
      borderRadius: '20px', color, background: bg,
      border: `1px solid ${border}`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Sidebar card (compact, dark) ──────────────────────────────────────────────

function SidebarJobCard({ job }: { job: LiveJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      padding: '10px', borderRadius: '7px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
          {job.title}
        </span>
        <MatchBadge source={job.source} />
      </div>

      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
        {job.company}{job.location ? ` · ${job.location}` : ''}
        {job.salary && <span style={{ color: '#34D399', marginLeft: '6px' }}>{job.salary}</span>}
      </div>

      {job.description && (
        <p style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.5, margin: '0 0 4px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {job.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        {job.description && job.description.length > 100 && (
          <button onClick={() => setExpanded(p => !p)} style={{
            background: 'none', border: 'none', padding: 0,
            fontSize: '10px', color: 'rgba(167,139,250,0.7)',
            cursor: 'pointer', fontFamily: 'Sora, sans-serif',
          }}>
            {expanded ? 'Less' : 'More'}
          </button>
        )}
        {job.applyUrl && (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: '10px', fontWeight: 600, padding: '3px 8px',
              borderRadius: '5px', background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA',
              textDecoration: 'none', marginLeft: 'auto',
            }}>
            Apply →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Full-page grid card (matches your existing card/btn/badge-neon classes) ───

function GridJobCard({ job }: { job: LiveJob }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base leading-snug">{job.title}</div>
          <div className="text-[var(--text-muted)] text-sm mt-0.5">
            {job.company}
            {job.location && <span> · {job.location}</span>}
          </div>
        </div>
        <MatchBadge source={job.source} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {job.jobType && (
          <span className="px-2 py-0.5 rounded badge-neon">{job.jobType}</span>
        )}
        {job.salary && (
          <span className="text-emerald-400 font-medium">{job.salary}</span>
        )}
        {job.postedAt && (
          <span className="text-[var(--text-muted)]">{job.postedAt}</span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div>
          <p className={`text-sm text-[var(--text-muted)] leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {job.description}
          </p>
          {job.description.length > 180 && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-auto pt-1">
        {job.applyUrl ? (
          <a className="btn" href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply
          </a>
        ) : (
          <button className="btn" disabled>Apply</button>
        )}
        <button className="btn btn-secondary">Save</button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function JobRecommendations({ layout = 'sidebar' }: Props) {
  const [jobs,    setJobs]    = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchRecs()
      .then(setJobs)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // ── Sidebar layout ──────────────────────────────────────────────────────────
  if (layout === 'sidebar') {
    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: '60px', borderRadius: '7px',
            background: 'rgba(255,255,255,0.04)',
            animation: 'raPulse 1.4s ease infinite',
          }} />
        ))}
      </div>
    );

    if (error) return (
      <p style={{ fontSize: '11px', color: '#F87171' }}>{error}</p>
    );

    if (!jobs.length) return (
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px 0' }}>
        No matches yet — analyse a resume first
      </p>
    );

    return (
      <div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'right', marginBottom: '6px' }}>
          {jobs.length} matches
        </div>
        {jobs.map(job => <SidebarJobCard key={job.id} job={job} />)}
      </div>
    );
  }

  // ── Grid layout (full page) ─────────────────────────────────────────────────
  if (loading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="card p-5 h-48 animate-pulse opacity-40" />
      ))}
    </div>
  );

  if (error) return (
    <div className="card p-6 text-center">
      <p className="text-red-400 text-sm">{error}</p>
      <button className="btn btn-secondary mt-3 text-xs" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );

  if (!jobs.length) return (
    <div className="card p-10 text-center">
      <p className="text-[var(--text-muted)] text-sm">
        No recommendations yet — upload and analyse your resume to get started.
      </p>
      <a href="/resumes" className="btn mt-4 inline-block text-sm">
        Analyse Resume →
      </a>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[var(--text-muted)] text-sm">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} matched to your profile
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-block w-2 h-2 rounded-full bg-violet-400" /> Featured (recruiter)
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 ml-2" /> Live (Google)
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map(job => <GridJobCard key={job.id} job={job} />)}
      </div>
    </div>
  );
}