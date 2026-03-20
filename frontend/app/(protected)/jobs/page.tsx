/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/jobs/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '@/lib/axios';
import {
  useJobs,
  useMyApplications,
  type UnifiedJob,
  type Application,
  type JobSource,
} from '@/hooks/useRealTimeAlerts';
import Pagination from '@/components/jobs/Pagination';
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Resume {
  id:         string;
  fileName?:  string;
  createdAt:  string;
  isDefault?: boolean;
}

type SourceFilter = 'all' | 'internal' | 'serpapi' | 'linkedin' | 'indeed';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12; // fills a 3-column grid evenly (12 = 3×4 or 4×3)

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtSalary = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const isNew = (iso: string) =>
  Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────────────────────────────────────

const APP_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', label: 'Applied'        },
  reviewed:    { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Under review'   },
  reviewing:   { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', label: 'Reviewing'      },
  shortlisted: { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', label: 'Shortlisted'    },
  interview:   { bg: 'rgba(251,191,36,0.12)',  color: '#FBBF24', label: 'Interview'      },
  offered:     { bg: 'rgba(52,211,153,0.15)',  color: '#10B981', label: 'Offer received' },
  rejected:    { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: 'Not selected'   },
  hired:       { bg: 'rgba(52,211,153,0.2)',   color: '#059669', label: 'Hired'          },
};

const SOURCE_META: Record<JobSource, {
  bg: string; color: string; border: string; label: string;
}> = {
  internal: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)', label: 'Recruiter' },
  serpapi:  { bg: 'rgba(96,165,250,0.12)',  color: '#60A5FA', border: 'rgba(96,165,250,0.25)',  label: 'Google'    },
  linkedin: { bg: 'rgba(14,118,168,0.15)',  color: '#0EA5E9', border: 'rgba(14,118,168,0.3)',   label: 'LinkedIn'  },
  indeed:   { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', border: 'rgba(52,211,153,0.25)',  label: 'Indeed'    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small components (SourceBadge, MatchBadge, SkeletonCard — unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: JobSource }) {
  const s = SOURCE_META[source] ?? SOURCE_META.serpapi;
  return (
    <span style={{
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
      padding:      '2px 8px',
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   600,
    }}>
      {s.label}
    </span>
  );
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#34D399' : score >= 60 ? '#A78BFA' : '#60A5FA';
  return (
    <span style={{
      background:   `${color}18`,
      color,
      border:       `1px solid ${color}30`,
      padding:      '2px 8px',
      borderRadius: 6,
      fontSize:     11,
      fontWeight:   700,
    }}>
      {score}% match
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      {[60, 40, 100, 32].map((w, i) => (
        <div
          key={i}
          style={{
            height:       i === 2 ? 60 : i === 3 ? 32 : 14,
            width:        `${w}%`,
            borderRadius: 6,
            background:   `rgba(255,255,255,0.0${i + 4})`,
            animation:    'pulse 1.5s ease infinite',
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCardCTA (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function JobCardCTA({
  job,
  application,
  onApply,
}: {
  job:         UnifiedJob;
  application: Application | undefined;
  onApply:     (j: UnifiedJob) => void;
}): React.ReactElement | null {

  if (application) {
    const b = APP_BADGE[application.status];
    if (!b) return null;
    return (
      <span style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: b.bg, color: b.color }}>
        {b.label}
      </span>
    );
  }

  if (job.source === 'internal') {
    return (
      <button className="btn text-sm" style={{ fontSize: 13 }} onClick={() => onApply(job)}>
        Apply now
      </button>
    );
  }

  if (job.applyUrl) {
    const url = job.applyUrl;
    return React.createElement(
      'a',
      {
        href:      url,
        target:    '_blank',
        rel:       'noopener noreferrer',
        className: 'btn text-sm',
        style:     { fontSize: 13 },
      },
      'Apply externally ↗'
    );
  }

  return (
    <button className="btn text-sm" disabled style={{ fontSize: 13, opacity: 0.4 }}>
      No apply link
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCard (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function JobCard({
  job,
  application,
  onApply,
}: {
  job:         UnifiedJob;
  application: Application | undefined;
  onApply:     (j: UnifiedJob) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const salary     = fmtSalary(job.salaryMin ?? null, job.salaryMax ?? null);
  const isInternal = job.source === 'internal';

  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {job.title}
            </span>
            <SourceBadge source={job.source} />
            {isNew(job.postedAt) && (
              <span style={{
                background:   'rgba(52,211,153,0.15)',
                color:        '#34D399',
                border:       '1px solid rgba(52,211,153,0.3)',
                padding:      '2px 7px',
                borderRadius: 20,
                fontSize:     10,
                fontWeight:   700,
              }}>
                NEW
              </span>
            )}
            {job.matchScore != null && job.matchScore > 0 && (
              <MatchBadge score={job.matchScore} />
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode  && ` · ${job.workMode}`}
          </p>
        </div>

        {isInternal && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {job.applicantCount} applied
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtDate(job.postedAt)}
            </div>
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {job.employmentType && (
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-muted)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}
        {salary && (
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(52,211,153,0.08)',
            color: '#34D399',
            border: '1px solid rgba(52,211,153,0.2)',
          }}>
            {salary}
          </span>
        )}
        {isInternal && job.requiredSkills.slice(0, 4).map(s => (
          <span key={s} style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(124,58,237,0.08)',
            color: '#A78BFA',
            border: '1px solid rgba(124,58,237,0.2)',
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* ── Description ── */}
      {job.description && (
        <div>
          <p style={{
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: expanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {job.description}
          </p>
          {job.description.length > 120 && (
            <button
              onClick={() => setExpanded(p => !p)}
              style={{
                fontSize: 12, color: '#A78BFA',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px 0 0',
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* ── Recruiter credit ── */}
      {isInternal && job.recruiterName && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Posted by <span style={{ color: '#A78BFA' }}>{job.recruiterName}</span>
        </p>
      )}

      {/* ── CTA row ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
        <JobCardCTA job={job} application={application} onApply={onApply} />
        <button className="btn btn-secondary text-sm" style={{ fontSize: 13 }}>
          Save
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApplyModal (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function ApplyModal({
  job,
  onClose,
  onSuccess,
}: {
  job:       UnifiedJob;
  onClose:   () => void;
  onSuccess: (id: string) => void;
}) {
  const [resumes,  setResumes]  = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [cover,    setCover]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  useEffect(() => {
    api.get<Resume[]>('/resumes')
      .then(({ data }) => {
        setResumes(data ?? []);
        const def = data?.find(r => r.isDefault) ?? data?.[0];
        if (def) setResumeId(def.id);
      })
      .catch(() => setResumes([]))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const submit = async () => {
    if (!resumeId) { setError('Please select a resume.'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/jobs/${job.id}/apply`, {
        resumeId,
        coverLetter: cover.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(job.id); onClose(); }, 1500);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })
          ?.response?.data?.message
        ?? (e instanceof Error ? e.message : 'Application failed.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const cancelStyle: React.CSSProperties = {
    flexGrow: 1, flexShrink: 1, flexBasis: '0%',
    padding: '10px', borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
  };

  const submitStyle = (disabled: boolean): React.CSSProperties => ({
    flexGrow: 2, flexShrink: 1, flexBasis: '0%',
    padding: '10px', borderRadius: 8,
    fontSize: 14, fontWeight: 700,
    background: disabled
      ? 'rgba(255,255,255,0.05)'
      : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))',
    border: disabled
      ? '1px solid rgba(255,255,255,0.1)'
      : '1px solid rgba(124,58,237,0.5)',
    color:   disabled ? 'rgba(255,255,255,0.3)' : '#fff',
    cursor:  disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.15s',
  });

  const isDisabled = loading || !resumeId || resumes.length === 0;

  return (
    <>
      <style>{`
        @keyframes mFade  { from{opacity:0} to{opacity:1} }
        @keyframes mSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mSpin  { to{transform:rotate(360deg)} }
        @keyframes mPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div
        onClick={() => onClose()}
        style={{
          minHeight:      '100vh',
          background:     'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '1rem',
          animation:      'mFade 0.2s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          className="card p-6 w-full"
          style={{
            maxWidth:  480,
            maxHeight: 'calc(100vh - 2rem)',
            overflowY: 'auto',
            animation: 'mSlide 0.25s ease',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          }}
        >
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <p style={{ color: '#34D399', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
                Application submitted!
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                You'll be notified of updates for <strong>{job.title}</strong>.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', marginBottom: '1.25rem',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 20, background: 'rgba(52,211,153,0.1)',
                      color: '#34D399', border: '1px solid rgba(52,211,153,0.2)',
                    }}>
                      APPLYING
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {job.title}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                    {job.workMode  ? ` · ${job.workMode}`  : ''}
                  </p>
                </div>
                <button
                  onClick={() => onClose()}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4 }}
                >
                  ✕
                </button>
              </div>

              {job.requiredSkills.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ margin: '0 0 7px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Required skills
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {job.requiredSkills.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Select resume *
                  </label>
                  {fetching ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1, 2].map(i => (
                        <div key={i} style={{ height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'mPulse 1.4s ease infinite' }} />
                      ))}
                    </div>
                  ) : resumes.length === 0 ? (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 13, color: '#F87171' }}>
                      No resumes uploaded yet.{' '}
                      <a href="/resumes" style={{ color: '#F87171', textDecoration: 'underline' }}>Upload one →</a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {resumes.map(r => (
                        <label key={r.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${resumeId === r.id ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                          background: resumeId === r.id ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.15s',
                        }}>
                          <input type="radio" name="resume" value={r.id} checked={resumeId === r.id} onChange={() => setResumeId(r.id)} style={{ accentColor: '#A78BFA', flexShrink: 0 }} />
                          <span style={{ fontSize: 15, flexShrink: 0 }}>📄</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: resumeId === r.id ? '#A78BFA' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.fileName ?? `Resume ${r.id.slice(0, 8)}`}
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {r.isDefault && <span style={{ marginLeft: 6, color: '#34D399' }}>· default</span>}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Cover note{' '}
                    <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
                  </label>
                  <textarea
                    value={cover}
                    onChange={e => setCover(e.target.value)}
                    rows={4}
                    placeholder={`Why are you a great fit for ${job.title} at ${job.company}?`}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  />
                  {cover.length > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                      {cover.length} characters
                    </p>
                  )}
                </div>

                {error && (
                  <p style={{ margin: 0, fontSize: 13, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                    {error}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onClose()} style={cancelStyle}>Cancel</button>
                  <button onClick={() => void submit()} disabled={isDisabled} style={submitStyle(isDisabled)}>
                    {loading ? (
                      <>
                        <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'mSpin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                        Submitting…
                      </>
                    ) : 'Submit application'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JobsPage — with URL-synced pagination
//
// URL state strategy:
//   /jobs?page=2&search=react&workMode=remote&source=linkedin
//
// Why URL state?
//   - Browser back/forward navigation works correctly
//   - Shareable / bookmarkable pages
//   - Refresh stays on the same page
//   - Free SSR-compatible without extra libraries
// ─────────────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // ── Read initial state from URL params ──────────────────────────────────────
  const [search,       setSearch]       = useState(searchParams.get('search')   ?? '');
  const [workMode,     setWorkMode]     = useState(searchParams.get('workMode') ?? '');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(
    (searchParams.get('source') as SourceFilter) ?? 'all'
  );
  const [page,         setPage]         = useState(
    Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  );
  const [applyTarget,  setApplyTarget]  = useState<UnifiedJob | null>(null);
  const [debounced,    setDebounced]    = useState(search);

  // ── Debounce search input ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1); // reset to page 1 on new search
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── Reset page to 1 whenever filters change ──────────────────────────────────
  // (search reset is handled above in its debounce handler)
  const handleWorkModeChange = (val: string) => {
    setWorkMode(val);
    setPage(1);
  };
  const handleSourceChange = (val: SourceFilter) => {
    setSourceFilter(val);
    setPage(1);
  };

  // ── Sync state → URL (shallow push — no full reload) ─────────────────────────
  const syncUrl = useCallback((
    p: number, s: string, wm: string, src: SourceFilter
  ) => {
    const params = new URLSearchParams();
    if (p  > 1)    params.set('page',     String(p));
    if (s)         params.set('search',   s);
    if (wm)        params.set('workMode', wm);
    if (src !== 'all') params.set('source', src);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    syncUrl(page, debounced, workMode, sourceFilter);
  }, [page, debounced, workMode, sourceFilter, syncUrl]);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const {
    jobs, total, totalPages, sources,
    loading, validating, error, refresh,
  } = useJobs({
    search:   debounced,
    workMode: workMode || undefined,
    source:   sourceFilter,
    page,
    limit:    PAGE_SIZE,
  });

  const { applications, applyOptimistic } = useMyApplications();
  const getApp = (jobId: string) => applications.find(a => a.job_id === jobId);

  // ── Scroll to top on page change ─────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const totalLive = sources.serpapi + sources.linkedin + sources.indeed;

  // ── Page change handler ───────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <section style={{ padding: '2rem 2rem 4rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Jobs
          </h1>
          <span
            title="Live — updates in real time via SSE"
            style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   validating ? '#34D399' : 'rgba(52,211,153,0.3)',
              boxShadow:    validating ? '0 0 6px #34D399' : 'none',
              transition:   'background 0.3s',
              display:      'inline-block',
            }}
          />
        </div>

        {!loading && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {total} openings ·{' '}
            <span style={{ color: '#A78BFA' }}>{sources.internal} recruiter</span> ·{' '}
            <span style={{ color: '#60A5FA' }}>{sources.serpapi} Google</span> ·{' '}
            <span style={{ color: '#0EA5E9' }}>{sources.linkedin} LinkedIn</span> ·{' '}
            <span style={{ color: '#34D399' }}>{sources.indeed} Indeed</span> ·{' '}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              {totalLive} live · refreshes every 30s
            </span>
          </p>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        marginBottom: '1.5rem', alignItems: 'center',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs, companies, skills…"
          style={{
            flex: 1, minWidth: 220,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 13, color: 'var(--text-primary)', outline: 'none',
          }}
        />

        <select
          value={workMode}
          onChange={e => handleWorkModeChange(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All modes</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">Onsite</option>
        </select>

        {/* Source filter */}
        <div style={{
          display: 'flex', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.09)', overflow: 'hidden',
        }}>
          {([
            { key: 'all',      label: 'All'       },
            { key: 'internal', label: 'Recruiter' },
            { key: 'serpapi',  label: 'Google'    },
            { key: 'linkedin', label: 'LinkedIn'  },
            { key: 'indeed',   label: 'Indeed'    },
          ] as { key: SourceFilter; label: string }[]).map(({ key, label }, i, arr) => (
            <button
              key={key}
              onClick={() => handleSourceChange(key)}
              style={{
                padding:     '7px 14px',
                fontSize:    12,
                fontWeight:  500,
                background:  sourceFilter === key ? 'rgba(124,58,237,0.2)' : 'transparent',
                color:       sourceFilter === key ? '#A78BFA' : 'var(--text-muted)',
                border:      'none',
                borderRight: i < arr.length - 1
                  ? '1px solid rgba(255,255,255,0.09)'
                  : 'none',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={refresh}
          disabled={validating}
          style={{
            padding: '7px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-muted)',
            cursor: validating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <span style={{ display: 'inline-block', animation: validating ? 'spin 0.8s linear infinite' : 'none', fontSize: 14 }}>
            ↻
          </span>
          {validating ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {/* ── My applications status strip ── */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            My applications:
          </span>
          {Object.entries(
            applications.reduce<Record<string, number>>((acc, a) => {
              acc[a.status] = (acc[a.status] ?? 0) + 1;
              return acc;
            }, {}),
          ).map(([status, count]) => {
            const b = APP_BADGE[status];
            if (!b) return null;
            return (
              <span
                key={status}
                style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: b.bg, color: b.color }}
              >
                {b.label} ({count})
              </span>
            );
          })}
        </div>
      )}

      {/* ── Job grid ── */}
      {error ? (
        <div className="card p-8" style={{ textAlign: 'center' }}>
          <p style={{ color: '#F87171', fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={refresh}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-10" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            No jobs found — try adjusting your filters
          </p>
        </div>
      ) : (
        <>
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

          {/* ── Pagination ── */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            loading={validating}
          />
        </>
      )}

      {/* ── Apply modal ── */}
      {applyTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ApplyModal
            job={applyTarget}
            onClose={() => setApplyTarget(null)}
            onSuccess={applyOptimistic}
          />
        </div>
      )}
    </section>
  );
}
