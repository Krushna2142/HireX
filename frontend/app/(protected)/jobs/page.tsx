/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/jobs/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface UnifiedJob {
  id:             string;
  source:         'internal' | 'serpapi';
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description:    string;
  postedAt:       string;
  applyUrl:       string | null;
  recruiterName:  string | null;
  applicantCount: number;
  matchScore?:    number;
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'internal' | 'serpapi' }) {
  return source === 'internal' ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}>
      Recruiter
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)' }}>
      Live
    </span>
  );
}

// ── Match score badge ─────────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#A78BFA' : '#60A5FA';
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      {score}% match
    </span>
  );
}

// ── Individual job card ───────────────────────────────────────────────────────

function JobCard({ job, onApply }: {
  job:     UnifiedJob;
  onApply: (job: UnifiedJob) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isInternal = job.source === 'internal';

  const salary = job.salaryMin && job.salaryMax
    ? `₹${(job.salaryMin / 100000).toFixed(0)}–${(job.salaryMax / 100000).toFixed(0)} LPA`
    : null;

  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-[var(--border-hover)] transition-colors">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm leading-snug">{job.title}</span>
            <SourceBadge source={job.source} />
            {job.matchScore != null && job.matchScore > 0 && (
              <MatchBadge score={job.matchScore} />
            )}
          </div>
          <p className="text-[var(--text-muted)] text-xs">
            {job.company}
            {job.location    && <span> · {job.location}</span>}
            {job.workMode    && <span> · {job.workMode}</span>}
          </p>
        </div>

        {/* Recruiter: show applicant count */}
        {isInternal && (
          <div className="text-right shrink-0">
            <div className="text-xs text-[var(--text-muted)]">{job.applicantCount} applied</div>
          </div>
        )}
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-2">
        {job.employmentType && (
          <span className="badge-neon px-2 py-0.5 rounded text-xs">{job.employmentType.replace('_', ' ')}</span>
        )}
        {salary && (
          <span className="text-emerald-400 text-xs font-medium">{salary}</span>
        )}
        {/* Recruiter jobs show required skills */}
        {isInternal && job.requiredSkills.slice(0, 4).map(skill => (
          <span key={skill} className="px-2 py-0.5 rounded text-xs"
            style={{ background: 'rgba(124,58,237,0.08)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
            {skill}
          </span>
        ))}
      </div>

      {/* Description */}
      {job.description && (
        <div>
          <p className={`text-sm text-[var(--text-muted)] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {job.description}
          </p>
          {job.description.length > 120 && (
            <button onClick={() => setExpanded(p => !p)}
              className="text-xs text-violet-400 hover:text-violet-300 mt-1 transition-colors">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Recruiter info */}
      {isInternal && job.recruiterName && (
        <p className="text-xs text-[var(--text-muted)]">
          Posted by <span className="text-violet-400">{job.recruiterName}</span>
        </p>
      )}

      {/* Actions — differ by source */}
      <div className="flex gap-2 mt-auto pt-1">
        {isInternal ? (
          // Internal: use in-app apply flow
          <>
            <button className="btn text-sm" onClick={() => onApply(job)}>
              Apply now
            </button>
            <button className="btn btn-secondary text-sm">Save</button>
          </>
        ) : (
          // SerpAPI: redirect to external URL
          <>
            {job.applyUrl ? (
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer"
                className="btn text-sm">
                Apply externally ↗
              </a>
            ) : (
              <button className="btn text-sm" disabled>No apply link</button>
            )}
            <button className="btn btn-secondary text-sm">Save</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Apply modal (internal jobs only) ─────────────────────────────────────────

function ApplyModal({ job, onClose }: { job: UnifiedJob; onClose: () => void }) {
  const [resumeId, setResumeId] = useState('');
  const [cover,    setCover]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const submit = async () => {
    if (!resumeId.trim()) { setError('Please enter your resume ID'); return; }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ resumeId, coverLetter: cover }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? 'Application failed');
      }
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div className="card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Apply to {job.title}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        <p className="text-[var(--text-muted)] text-sm mb-4">{job.company}</p>

        {success ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-emerald-400 font-semibold">Application submitted!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Resume ID</label>
              <input
                value={resumeId}
                onChange={e => setResumeId(e.target.value)}
                placeholder="Paste your resume ID from the sidebar"
                className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cover note (optional)</label>
              <textarea
                value={cover}
                onChange={e => setCover(e.target.value)}
                rows={4}
                placeholder="Why are you a good fit?"
                className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 resize-none"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={() => void submit()} disabled={loading} className="btn w-full">
              {loading ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs,        setJobs]        = useState<UnifiedJob[]>([]);
  const [total,       setTotal]       = useState(0);
  const [sources,     setSources]     = useState({ internal: 0, serpapi: 0 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [workMode,    setWorkMode]    = useState('');
  const [sourceFilter,setSourceFilter]= useState<'all' | 'internal' | 'serpapi'>('all');
  const [applyTarget, setApplyTarget] = useState<UnifiedJob | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token  = localStorage.getItem('token');
      const params = new URLSearchParams({
        ...(search       && { search }),
        ...(workMode     && { workMode }),
        ...(sourceFilter && { source: sourceFilter }),
      });

      const res = await fetch(`${API}/jobs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setSources(data.sources);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, workMode, sourceFilter]);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="section-header mb-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
        {!loading && (
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {total} jobs ·{' '}
            <span style={{ color: '#A78BFA' }}>{sources.internal} recruiter-posted</span>
            {' · '}
            <span style={{ color: '#60A5FA' }}>{sources.serpapi} live from Google</span>
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs, companies, skills…"
          className="flex-1 min-w-[200px] bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
        />

        <select
          value={workMode}
          onChange={e => setWorkMode(e.target.value)}
          className="bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
        >
          <option value="">All modes</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>

        {/* Source filter — the key control */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {(['all', 'internal', 'serpapi'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className="px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background:   sourceFilter === s ? 'rgba(124,58,237,0.2)' : 'transparent',
                color:        sourceFilter === s ? '#A78BFA' : 'var(--text-muted)',
                borderRight:  s !== 'serpapi' ? '1px solid var(--border)' : undefined,
              }}
            >
              {s === 'all'      ? 'All'      :
               s === 'internal' ? 'Recruiter' : 'Live'}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5 h-48 animate-pulse opacity-40" />
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button className="btn btn-secondary text-sm" onClick={() => void fetchJobs()}>Retry</button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[var(--text-muted)] text-sm">No jobs found — try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onApply={setApplyTarget} />
          ))}
        </div>
      )}

      {/* Apply modal */}
      {applyTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ApplyModal job={applyTarget} onClose={() => setApplyTarget(null)} />
        </div>
      )}
    </section>
  );
}
