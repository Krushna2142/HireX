/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/jobs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useJobs, useMyApplications, type UnifiedJob, type Application } from '@/hooks/useRealTimeAlerts';

interface Resume { id: string; fileName?: string; createdAt: string; }
type SourceFilter = 'all' | 'internal' | 'serpapi';

const fmtSalary = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const isNew   = (iso: string) => Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

const APP_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', label: 'Applied'        },
  reviewed:    { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Under review'   },
  shortlisted: { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', label: 'Shortlisted'    },
  interview:   { bg: 'rgba(251,191,36,0.12)',  color: '#FBBF24', label: 'Interview'      },
  offered:     { bg: 'rgba(52,211,153,0.15)',  color: '#10B981', label: 'Offer received' },
  rejected:    { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Not selected'   },
};

function SourceBadge({ source }: { source: 'internal' | 'serpapi' }) {
  return source === 'internal'
    ? <span style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Recruiter</span>
    : <span style={{ background: 'rgba(96,165,250,0.12)',  color: '#60A5FA', border: '1px solid rgba(96,165,250,0.25)',  padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Live</span>;
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#A78BFA' : '#60A5FA';
  return <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{score}% match</span>;
}

function SkeletonCard() {
  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[60, 40, 100, 32].map((w, i) => <div key={i} style={{ height: i === 2 ? 60 : i === 3 ? 32 : 14, width: `${w}%`, borderRadius: 6, background: `rgba(255,255,255,0.0${i + 4})`, animation: 'pulse 1.5s ease infinite' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function JobCard({ job, application, onApply }: { job: UnifiedJob; application: Application | undefined; onApply: (j: UnifiedJob) => void }) {
  const [expanded, setExpanded] = useState(false);
  const salary     = fmtSalary(job.salaryMin, job.salaryMax);
  const isInternal = job.source === 'internal';
  const appBadge   = application ? APP_BADGE[application.status] : null;

  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{job.title}</span>
            <SourceBadge source={job.source} />
            {isNew(job.postedAt) && <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>NEW</span>}
            {job.matchScore != null && job.matchScore > 0 && <MatchBadge score={job.matchScore} />}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{job.company}{job.location && ` · ${job.location}`}{job.workMode && ` · ${job.workMode}`}</p>
        </div>
        {isInternal && <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.applicantCount} applied</div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(job.postedAt)}</div></div>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {job.employmentType && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}>{job.employmentType.replace('_', ' ')}</span>}
        {salary && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }}>{salary}</span>}
        {isInternal && job.requiredSkills.slice(0, 4).map(s => <span key={s} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>{s}</span>)}
      </div>

      {job.description && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>{job.description}</p>
          {job.description.length > 120 && <button onClick={() => setExpanded(p => !p)} style={{ fontSize: 12, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0' }}>{expanded ? 'Show less' : 'Read more'}</button>}
        </div>
      )}

      {isInternal && job.recruiterName && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Posted by <span style={{ color: '#A78BFA' }}>{job.recruiterName}</span></p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
        {appBadge ? (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, ...appBadge }}>{appBadge.label}</span>
        ) : isInternal ? (
          <button className="btn text-sm" onClick={() => onApply(job)} style={{ fontSize: 13 }}>Apply now</button>
        ) : job.applyUrl ? (
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="btn text-sm" style={{ fontSize: 13 }}>Apply externally ↗</a>
        ) : (
          <button className="btn text-sm" disabled style={{ fontSize: 13, opacity: 0.4 }}>No apply link</button>
        )}
        <button className="btn btn-secondary text-sm" style={{ fontSize: 13 }}>Save</button>
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose, onSuccess }: { job: UnifiedJob; onClose: () => void; onSuccess: (id: string) => void }) {
  const [resumes, setResumes]   = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [cover, setCover]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    api.get<Resume[]>('/resumes').then(({ data }) => { setResumes(data); if (data.length === 1) setResumeId(data[0].id); }).catch(() => {}).finally(() => setFetching(false));
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const submit = async () => {
    if (!resumeId) { setError('Please select a resume'); return; }
    setLoading(true); setError(null);
    try {
      await api.post(`/jobs/${job.id}/apply`, { resumeId, coverLetter: cover || undefined });
      setSuccess(true);
      setTimeout(() => { onSuccess(job.id); onClose(); }, 1500);
    } catch (e: any) { setError(e.response?.data?.message ?? 'Application failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card p-6 w-full" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div><h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Apply to {job.title}</h2><p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{job.company}</p></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div><p style={{ color: '#34D399', fontWeight: 600, margin: 0 }}>Application submitted!</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Select resume *</label>
              {fetching ? <div style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
                : resumes.length === 0 ? <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 13, color: '#F87171' }}>No resumes. <a href="/resumes" style={{ color: '#F87171', textDecoration: 'underline' }}>Upload one →</a></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {resumes.map(r => (
                      <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${resumeId === r.id ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`, background: resumeId === r.id ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                        <input type="radio" name="resume" value={r.id} checked={resumeId === r.id} onChange={() => setResumeId(r.id)} style={{ accentColor: '#A78BFA' }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: resumeId === r.id ? '#A78BFA' : 'var(--text-primary)' }}>{r.fileName ?? `Resume ${r.id.slice(0, 8)}`}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </label>
                    ))}
                  </div>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Cover note <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <textarea value={cover} onChange={e => setCover(e.target.value)} rows={4} placeholder="Why are you a great fit?" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', resize: 'vertical', outline: 'none' }} />
            </div>
            {error && <p style={{ margin: 0, fontSize: 13, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '8px 12px' }}>{error}</p>}
            <button onClick={() => void submit()} disabled={loading || !resumeId || resumes.length === 0} className="btn w-full" style={{ opacity: (loading || !resumeId || resumes.length === 0) ? 0.5 : 1, fontSize: 14 }}>
              {loading ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [search,       setSearch]       = useState('');
  const [workMode,     setWorkMode]     = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [applyTarget,  setApplyTarget]  = useState<UnifiedJob | null>(null);
  const [debounced,    setDebounced]    = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 350); return () => clearTimeout(t); }, [search]);

  const { jobs, total, sources, loading, validating, error, refresh } = useJobs({ search: debounced, workMode: workMode || undefined, source: sourceFilter });
  const { applications, applyOptimistic } = useMyApplications();
  const getApp = (jobId: string) => applications.find(a => a.job_id === jobId);

  return (
    <section style={{ padding: '2rem 2rem 4rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Jobs</h1>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: validating ? '#34D399' : 'rgba(52,211,153,0.3)', transition: 'background 0.3s', boxShadow: validating ? '0 0 6px #34D399' : 'none' }} title="Live" />
        </div>
        {!loading && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{total} openings · <span style={{ color: '#A78BFA' }}>{sources.internal} recruiter-posted</span> · <span style={{ color: '#60A5FA' }}>{sources.serpapi} live</span> · <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>refreshes every 30s</span></p>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs, companies, skills…" style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
        <select value={workMode} onChange={e => setWorkMode(e.target.value)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
          <option value="">All modes</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
        </select>
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden' }}>
          {(['all', 'internal', 'serpapi'] as SourceFilter[]).map((s, i) => (
            <button key={s} onClick={() => setSourceFilter(s)} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 500, background: sourceFilter === s ? 'rgba(124,58,237,0.2)' : 'transparent', color: sourceFilter === s ? '#A78BFA' : 'var(--text-muted)', border: 'none', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.09)' : 'none', cursor: 'pointer' }}>
              {s === 'all' ? 'All' : s === 'internal' ? 'Recruiter' : 'Live'}
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={validating} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', cursor: validating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', animation: validating ? 'spin 0.8s linear infinite' : 'none', fontSize: 14 }}>↻</span>
          {validating ? 'Updating…' : 'Refresh'}
        </button>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>

      {applications.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>My applications:</span>
          {Object.entries(applications.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {})).map(([status, count]) => {
            const b = APP_BADGE[status]; if (!b) return null;
            return <span key={status} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, ...b }}>{b.label} ({count})</span>;
          })}
        </div>
      )}

      {error ? (
        <div className="card p-8" style={{ textAlign: 'center' }}><p style={{ color: '#F87171', fontSize: 14, marginBottom: 12 }}>{error}</p><button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={refresh}>Retry</button></div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>{Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : jobs.length === 0 ? (
        <div className="card p-10" style={{ textAlign: 'center' }}><p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>No jobs found — try adjusting your filters</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {jobs.map(job => <JobCard key={job.id} job={job} application={getApp(job.id)} onApply={setApplyTarget} />)}
        </div>
      )}

      {applyTarget && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}><ApplyModal job={applyTarget} onClose={() => setApplyTarget(null)} onSuccess={applyOptimistic} /></div>}
    </section>
  );
}