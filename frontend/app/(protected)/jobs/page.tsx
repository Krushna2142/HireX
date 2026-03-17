/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/jobs/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/axios';  // ← interceptor injects jc_token automatically

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface Resume {
  id:         string;
  file_name?: string;
  created_at: string;
}

interface Application {
  job_id: string;
  status: 'applied' | 'reviewed' | 'shortlisted' | 'interview' | 'offered' | 'rejected';
}

type SourceFilter = 'all' | 'internal' | 'serpapi';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtSalary = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const APP_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', label: 'Applied'       },
  reviewed:    { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Under review'  },
  shortlisted: { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', label: 'Shortlisted'   },
  interview:   { bg: 'rgba(251,191,36,0.12)',  color: '#FBBF24', label: 'Interview'     },
  offered:     { bg: 'rgba(52,211,153,0.15)',  color: '#10B981', label: 'Offer received'},
  rejected:    { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Not selected'  },
};

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'internal' | 'serpapi' }) {
  return source === 'internal' ? (
    <span style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      Recruiter
    </span>
  ) : (
    <span style={{ background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      Live
    </span>
  );
}

// ── Match badge ───────────────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#A78BFA' : '#60A5FA';
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {score}% match
    </span>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 14, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.07)', animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 11, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 60, borderRadius: 6, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({
  job,
  application,
  onApply,
}: {
  job:         UnifiedJob;
  application: Application | undefined;
  onApply:     (job: UnifiedJob) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const salary    = fmtSalary(job.salaryMin, job.salaryMax);
  const isInternal = job.source === 'internal';
  const appBadge   = application ? APP_BADGE[application.status] : null;

  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12, transition: 'border-color 0.2s' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: 'var(--text-primary)' }}>{job.title}</span>
            <SourceBadge source={job.source} />
            {job.matchScore != null && job.matchScore > 0 && <MatchBadge score={job.matchScore} />}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode && ` · ${job.workMode}`}
          </p>
        </div>
        {isInternal && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.applicantCount} applied</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(job.postedAt)}</div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {job.employmentType && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}
        {salary && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>
            {salary}
          </span>
        )}
        {isInternal && job.requiredSkills.slice(0, 4).map(skill => (
          <span key={skill} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
            {skill}
          </span>
        ))}
      </div>

      {/* Description */}
      {job.description && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>
            {job.description}
          </p>
          {job.description.length > 120 && (
            <button onClick={() => setExpanded(p => !p)} style={{ fontSize: 12, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', transition: 'color 0.15s' }}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Recruiter credit */}
      {isInternal && job.recruiterName && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Posted by <span style={{ color: '#A78BFA' }}>{job.recruiterName}</span>
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
        {/* Already applied — show status pill */}
        {appBadge ? (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, ...appBadge }}>
            {appBadge.label}
          </span>
        ) : isInternal ? (
          <button className="btn text-sm" onClick={() => onApply(job)} style={{ fontSize: 13 }}>
            Apply now
          </button>
        ) : job.applyUrl ? (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="btn text-sm" style={{ fontSize: 13 }}>
            Apply externally ↗
          </a>
        ) : (
          <button className="btn text-sm" disabled style={{ fontSize: 13, opacity: 0.4 }}>No apply link</button>
        )}
        <button className="btn btn-secondary text-sm" style={{ fontSize: 13 }}>Save</button>
      </div>
    </div>
  );
}

// ── Apply modal ───────────────────────────────────────────────────────────────

function ApplyModal({ job, onClose, onSuccess }: {
  job:       UnifiedJob;
  onClose:   () => void;
  onSuccess: (jobId: string) => void;
}) {
  const [resumes,  setResumes]  = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [cover,    setCover]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  // Fetch the user's resumes so they can pick one
  useEffect(() => {
    api.get<Resume[]>('/api/resumes')
      .then(({ data }) => {
        setResumes(data);
        if (data.length === 1) setResumeId(data[0].id); // auto-select if only one
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const submit = async () => {
    if (!resumeId) { setError('Please select a resume'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/jobs/${job.id}/apply`, {
        resumeId,
        coverLetter: cover || undefined,
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(job.id); onClose(); }, 1500);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  // Trap focus & close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card p-6 w-full" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Apply to {job.title}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{job.company}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ color: '#34D399', fontWeight: 600, margin: 0 }}>Application submitted!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Resume selector */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                Select resume *
              </label>
              {fetching ? (
                <div style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
              ) : resumes.length === 0 ? (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 13, color: '#F87171' }}>
                  No resumes found.{' '}
                  <a href="/resumes" style={{ color: '#F87171', textDecoration: 'underline' }}>Upload one first →</a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {resumes.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${resumeId === r.id ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`, background: resumeId === r.id ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="radio" name="resume" value={r.id} checked={resumeId === r.id} onChange={() => setResumeId(r.id)} style={{ accentColor: '#A78BFA' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: resumeId === r.id ? '#A78BFA' : 'var(--text-primary)' }}>
                          {r.file_name ?? `Resume ${r.id.slice(0, 8)}`}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Cover note */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                Cover note <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={cover}
                onChange={e => setCover(e.target.value)}
                rows={4}
                placeholder="Why are you a great fit for this role?"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', resize: 'vertical', outline: 'none' }}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <button
              onClick={() => void submit()}
              disabled={loading || !resumeId || resumes.length === 0}
              className="btn w-full"
              style={{ opacity: (loading || !resumeId || resumes.length === 0) ? 0.5 : 1, fontSize: 14 }}
            >
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
  const [jobs,         setJobs]         = useState<UnifiedJob[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [total,        setTotal]        = useState(0);
  const [sources,      setSources]      = useState({ internal: 0, serpapi: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [workMode,     setWorkMode]     = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [applyTarget,  setApplyTarget]  = useState<UnifiedJob | null>(null);

  // Debounce search input
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search   = debouncedSearch;
      if (workMode)        params.workMode  = workMode;
      if (sourceFilter !== 'all') params.source = sourceFilter;

      const { data } = await api.get<{
        jobs:    UnifiedJob[];
        total:   number;
        sources: { internal: number; serpapi: number };
      }>('/api/jobs', { params });

      setJobs(data.jobs);
      setTotal(data.total);
      setSources(data.sources);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, workMode, sourceFilter]);

  useEffect(() => { void fetchJobs(); }, [fetchJobs]);

  // Fetch my applications (to show status badges)
  useEffect(() => {
    api.get<Application[]>('/api/jobs/applications/mine')
      .then(({ data }) => setApplications(data))
      .catch(() => {});
  }, []);

  const getApp = (jobId: string) => applications.find(a => a.job_id === jobId);

  // When an application is submitted, optimistically add it
  const handleApplySuccess = (jobId: string) => {
    setApplications(prev => [...prev, { job_id: jobId, status: 'applied' }]);
  };

  return (
    <section style={{ padding: '2rem 2rem 4rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>Jobs</h1>
        {!loading && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {total} openings ·{' '}
            <span style={{ color: '#A78BFA' }}>{sources.internal} recruiter-posted</span>
            {' · '}
            <span style={{ color: '#60A5FA' }}>{sources.serpapi} live from Google</span>
          </p>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem', alignItems: 'center' }}>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs, companies, skills…"
          style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
        />

        {/* Work mode */}
        <select
          value={workMode}
          onChange={e => setWorkMode(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All modes</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>

        {/* Source toggle */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden' }}>
          {(['all', 'internal', 'serpapi'] as SourceFilter[]).map((s, i) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 500,
                background:  sourceFilter === s ? 'rgba(124,58,237,0.2)'   : 'transparent',
                color:       sourceFilter === s ? '#A78BFA'                 : 'var(--text-muted)',
                border:      'none',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.09)' : 'none',
                cursor:      'pointer', transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? 'All' : s === 'internal' ? 'Recruiter' : 'Live'}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => void fetchJobs()}
          disabled={loading}
          style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span style={{ display: 'inline-block', animation: loading ? 'spin 0.8s linear infinite' : 'none', fontSize: 14 }}>↻</span>
          Refresh
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* My applications status strip */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>My applications:</span>
          {Object.entries(
            applications.reduce<Record<string, number>>((acc, a) => {
              acc[a.status] = (acc[a.status] ?? 0) + 1;
              return acc;
            }, {})
          ).map(([status, count]) => {
            const b = APP_BADGE[status];
            if (!b) return null;
            return (
              <span key={status} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, ...b }}>
                {b.label} ({count})
              </span>
            );
          })}
        </div>
      )}

      {/* Results */}
      {error ? (
        <div className="card p-8" style={{ textAlign: 'center' }}>
          <p style={{ color: '#F87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => void fetchJobs()}>Retry</button>
        </div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-10" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            No jobs found — try adjusting your filters or refreshing
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              application={getApp(job.id)}
              onApply={setApplyTarget}
            />
          ))}
        </div>
      )}

      {/* Apply modal */}
      {applyTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ApplyModal
            job={applyTarget}
            onClose={() => setApplyTarget(null)}
            onSuccess={handleApplySuccess}
          />
        </div>
      )}
    </section>
  );
}