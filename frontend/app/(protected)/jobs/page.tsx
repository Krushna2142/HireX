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

interface Resume { id: string; fileName?: string; createdAt: string; isDefault?: boolean; }
type SourceFilter = 'all' | 'internal' | 'serpapi' | 'linkedin' | 'indeed';
type SavedJobPayload = UnifiedJob & { savedAt?: string };

const PAGE_SIZE = 24;
const SAVED_JOBS_KEY = 'jc_saved_jobs';
const SAVED_JOB_IDS_KEY = 'savedJobIds';

const fmtSalary = (min: number | null, max: number | null): string | null => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;

function normalizeApplicationStatus(status?: string | null): string {
  const value = String(status ?? '').toLowerCase();
  if (value === 'applied') return 'applied';
  if (value === 'under_review') return 'reviewing';
  if (value === 'reviewed') return 'reviewed';
  if (value === 'reviewing') return 'reviewing';
  if (value === 'shortlisted') return 'shortlisted';
  if (value === 'interview_scheduled') return 'interview';
  if (value === 'interview_in_progress') return 'interview';
  if (value === 'interview_passed') return 'offered';
  if (value === 'interview_failed') return 'rejected';
  if (value === 'final_review') return 'reviewing';
  if (value === 'offered') return 'offered';
  if (value === 'hired') return 'hired';
  if (value === 'rejected') return 'rejected';
  return value || 'applied';
}

function getApplicationJobId(application: Application): string {
  return (application as any).job_id ?? (application as any).jobId ?? (application as any).job?.id ?? (application as any).jobs?.id ?? '';
}

function readSavedJobs(): SavedJobPayload[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SAVED_JOBS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: any) => item && typeof item === 'object' && item.id).map((item: any) => item as SavedJobPayload);
  } catch { return []; }
}

function persistSavedJobs(jobs: SavedJobPayload[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(jobs));
  localStorage.setItem(SAVED_JOB_IDS_KEY, JSON.stringify(jobs.map((job) => job.id)));
  window.dispatchEvent(new Event('jc:saved-jobs-changed'));
}

const APP_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  applied: { bg: 'bg-[rgba(96,165,250,0.1)]', color: 'text-[#60A5FA]', label: 'Applied' },
  reviewing: { bg: 'bg-[rgba(167,139,250,0.1)]', color: 'text-[#A78BFA]', label: 'Under review' },
  shortlisted: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', label: 'Shortlisted' },
  interview: { bg: 'bg-[rgba(251,191,36,0.1)]', color: 'text-[#FBBF24]', label: 'Interview' },
  offered: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', label: 'Offer received' },
  rejected: { bg: 'bg-[rgba(248,113,113,0.1)]', color: 'text-[#F87171]', label: 'Not selected' },
  hired: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', label: 'Hired' },
};

const SOURCE_META: Record<JobSource, { bg: string; color: string; border: string; label: string }> = {
  internal: { bg: 'bg-[rgba(167,139,250,0.1)]', color: 'text-[#A78BFA]', border: 'border-[rgba(167,139,250,0.2)]', label: 'Recruiter' },
  serpapi: { bg: 'bg-[rgba(96,165,250,0.1)]', color: 'text-[#60A5FA]', border: 'border-[rgba(96,165,250,0.2)]', label: 'Google' },
  linkedin: { bg: 'bg-[rgba(56,189,248,0.1)]', color: 'text-[#38BDF8]', border: 'border-[rgba(56,189,248,0.2)]', label: 'LinkedIn' },
  indeed: { bg: 'bg-[rgba(52,211,153,0.1)]', color: 'text-[#34D399]', border: 'border-[rgba(52,211,153,0.2)]', label: 'Indeed' },
};

function SourceBadge({ source }: { source: JobSource }) {
  const s = SOURCE_META[source] ?? SOURCE_META.serpapi;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg} ${s.color} ${s.border}`}>
      {s.label}
    </span>
  );
}

function MatchBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-[#34D399] bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.2)]' : score >= 60 ? 'text-[#A78BFA] bg-[rgba(167,139,250,0.1)] border-[rgba(167,139,250,0.2)]' : 'text-[#60A5FA] bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.2)]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${color}`}>
      {score}% match
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-[rgba(255,255,255,0.05)] rounded w-3/4" />
          <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded w-1/2" />
        </div>
        <div className="h-6 w-16 bg-[rgba(255,255,255,0.05)] rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-[rgba(255,255,255,0.05)] rounded-full" />
        <div className="h-6 w-20 bg-[rgba(255,255,255,0.05)] rounded-full" />
      </div>
      <div className="h-16 bg-[rgba(255,255,255,0.05)] rounded-lg" />
      <div className="flex gap-2 mt-auto">
        <div className="h-10 flex-1 bg-[rgba(255,255,255,0.05)] rounded-lg" />
        <div className="h-10 w-24 bg-[rgba(255,255,255,0.05)] rounded-lg" />
      </div>
    </div>
  );
}

function JobCardCTA({ job, application, onApply }: { job: UnifiedJob; application: Application | undefined; onApply: (j: UnifiedJob) => void; }): React.ReactElement | null {
  if (application) {
    const normalizedStatus = normalizeApplicationStatus(application.status);
    const b = APP_BADGE[normalizedStatus];
    if (!b) return null;
    return <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${b.bg} ${b.color}`}>{b.label}</span>;
  }
  if (job.source === 'internal') {
    return <button onClick={() => onApply(job)} className="px-4 py-2 bg-[#38BDF8] text-[#070B14] text-sm font-semibold rounded-lg hover:bg-[#38BDF8]/90 transition-colors">Apply now</button>;
  }
  if (job.applyUrl) {
    return <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-sm font-semibold rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors text-center">Apply externally ↗</a>;
  }
  return <button disabled className="px-4 py-2 bg-[rgba(255,255,255,0.05)] text-sm font-semibold rounded-lg opacity-40 cursor-not-allowed">No apply link</button>;
}

function JobCard({ job, application, onApply, saved, onToggleSave }: { job: UnifiedJob; application: Application | undefined; onApply: (j: UnifiedJob) => void; saved: boolean; onToggleSave: (j: UnifiedJob) => void; }) {
  const [expanded, setExpanded] = useState(false);
  const salary = fmtSalary(job.salaryMin ?? null, job.salaryMax ?? null);
  const isInternal = job.source === 'internal';

  return (
    <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6 flex flex-col gap-4 hover:border-[rgba(255,255,255,0.12)] transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-base font-semibold text-[#F8FAFC] truncate">{job.title}</h3>
            <SourceBadge source={job.source} />
            {isNew(job.postedAt) && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(52,211,153,0.1)] text-[#34D399] border border-[rgba(52,211,153,0.2)]">NEW</span>}
            {job.matchScore != null && job.matchScore > 0 && <MatchBadge score={job.matchScore} />}
          </div>
          <p className="text-sm text-[rgba(226,232,240,0.68)] truncate">
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.workMode && ` · ${job.workMode}`}
          </p>
        </div>
        {isInternal && (
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-[rgba(226,232,240,0.5)]">{job.applicantCount} applied</div>
            <div className="text-[10px] text-[rgba(226,232,240,0.3)] mt-1">{fmtDate(job.postedAt)}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {job.employmentType && <span className="px-2 py-1 rounded-md text-[11px] bg-[rgba(255,255,255,0.05)] text-[rgba(226,232,240,0.68)] border border-[rgba(255,255,255,0.07)]">{job.employmentType.replace('_', ' ')}</span>}
        {salary && <span className="px-2 py-1 rounded-md text-[11px] bg-[rgba(52,211,153,0.05)] text-[#34D399] border border-[rgba(52,211,153,0.1)]">{salary}</span>}
        {isInternal && job.requiredSkills.slice(0, 4).map((skill) => (
          <span key={skill} className="px-2 py-1 rounded-md text-[11px] bg-[rgba(167,139,250,0.05)] text-[#A78BFA] border border-[rgba(167,139,250,0.1)]">{skill}</span>
        ))}
      </div>

      {job.description && (
        <div>
          <p className={`text-sm text-[rgba(226,232,240,0.68)] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{job.description}</p>
          {job.description.length > 120 && (
            <button onClick={() => setExpanded(p => !p)} className="text-xs text-[#A78BFA] hover:text-[#A78BFA]/80 mt-2 transition-colors">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {isInternal && job.recruiterName && (
        <p className="text-xs text-[rgba(226,232,240,0.5)]">Posted by <span className="text-[#A78BFA]">{job.recruiterName}</span></p>
      )}

      <div className="flex gap-3 mt-auto pt-2">
        <JobCardCTA job={job} application={application} onApply={onApply} />
        <button
          onClick={() => onToggleSave(job)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${saved ? 'bg-[rgba(52,211,153,0.1)] text-[#34D399] border-[rgba(52,211,153,0.2)]' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(226,232,240,0.68)] border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.1)]'}`}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose, onSuccess }: { job: UnifiedJob; onClose: () => void; onSuccess: (id: string) => void; }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [cover, setCover] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get<Resume[]>('/resumes').then(({ data }) => {
      setResumes(data ?? []);
      const def = data?.find((r) => r.isDefault) ?? data?.[0];
      if (def) setResumeId(def.id);
    }).catch(() => setResumes([])).finally(() => setFetching(false));
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
    setLoading(true); setError(null);
    try {
      await api.post(`/jobs/${job.id}/apply`, { resumeId, coverLetter: cover.trim() || undefined });
      setSuccess(true);
      setTimeout(() => { onSuccess(job.id); onClose(); }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Application failed.');
    } finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div onClick={(e) => e.stopPropagation()} className="bg-[#0D1424] border border-[rgba(255,255,255,0.12)] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-[#34D399] font-bold text-lg mb-2">Application submitted!</p>
            <p className="text-[rgba(226,232,240,0.68)] text-sm">You'll be notified of updates for <strong className="text-[#E2E8F0]">{job.title}</strong>.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(52,211,153,0.1)] text-[#34D399] border border-[rgba(52,211,153,0.2)] mb-2">APPLYING</span>
                <h2 className="text-lg font-bold text-[#F8FAFC] leading-tight">{job.title}</h2>
                <p className="text-sm text-[rgba(226,232,240,0.68)] mt-1">{job.company}{job.location ? ` · ${job.location}` : ''}{job.workMode ? ` · ${job.workMode}` : ''}</p>
              </div>
              <button onClick={onClose} className="text-[rgba(226,232,240,0.5)] hover:text-[#E2E8F0] text-xl leading-none p-1">✕</button>
            </div>

            {job.requiredSkills.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-bold text-[rgba(226,232,240,0.5)] uppercase tracking-wider mb-2">Required skills</p>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <span key={skill} className="px-2 py-1 rounded-md text-[11px] bg-[rgba(167,139,250,0.05)] text-[#A78BFA] border border-[rgba(167,139,250,0.1)]">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[rgba(226,232,240,0.68)] mb-2">Select resume *</label>
                {fetching ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-12 bg-[rgba(255,255,255,0.05)] rounded-lg animate-pulse" />)}
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)] text-[#F87171] text-sm">
                    No resumes uploaded yet. <a href="/resumes" className="underline">Upload one →</a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resumes.map((resume) => (
                      <label key={resume.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${resumeId === resume.id ? 'bg-[rgba(167,139,250,0.05)] border-[rgba(167,139,250,0.2)]' : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.1)]'}`}>
                        <input type="radio" name="resume" value={resume.id} checked={resumeId === resume.id} onChange={() => setResumeId(resume.id)} className="accent-[#A78BFA]" />
                        <span className="text-lg">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${resumeId === resume.id ? 'text-[#A78BFA]' : 'text-[#E2E8F0]'}`}>{resume.fileName ?? `Resume ${resume.id.slice(0, 8)}`}</p>
                          <p className="text-[11px] text-[rgba(226,232,240,0.5)]">{new Date(resume.createdAt).toLocaleDateString('en-IN')} {resume.isDefault && <span className="text-[#34D399]">· default</span>}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[rgba(226,232,240,0.68)] mb-2">Cover note <span className="text-[rgba(226,232,240,0.3)] font-normal">(optional)</span></label>
                <textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={4} placeholder={`Why are you a great fit for ${job.title} at ${job.company}?`} className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg p-3 text-sm text-[#E2E8F0] placeholder-[rgba(226,232,240,0.3)] focus:outline-none focus:border-[rgba(167,139,250,0.5)] resize-none" />
              </div>

              {error && <p className="text-sm text-[#F87171] bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)] rounded-lg p-3">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-[rgba(226,232,240,0.68)] font-semibold text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors">Cancel</button>
                <button onClick={submit} disabled={loading || !resumeId || resumes.length === 0} className="flex-[2] py-3 rounded-lg bg-[#38BDF8] text-[#070B14] font-bold text-sm hover:bg-[#38BDF8]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (<><span className="w-3 h-3 border-2 border-[#070B14]/20 border-t-[#070B14] rounded-full animate-spin" />Submitting…</>) : 'Submit application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [workMode, setWorkMode] = useState(searchParams.get('workMode') ?? '');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>((searchParams.get('source') as SourceFilter) ?? 'all');
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)));
  const [applyTarget, setApplyTarget] = useState<UnifiedJob | null>(null);
  const [debounced, setDebounced] = useState(search);
  const [savedJobs, setSavedJobs] = useState<SavedJobPayload[]>([]);

  useEffect(() => {
    function syncSavedJobs() { setSavedJobs(readSavedJobs()); }
    syncSavedJobs();
    window.addEventListener('storage', syncSavedJobs);
    window.addEventListener('jc:saved-jobs-changed', syncSavedJobs);
    return () => { window.removeEventListener('storage', syncSavedJobs); window.removeEventListener('jc:saved-jobs-changed', syncSavedJobs); };
  }, []);

  const savedIds = new Set(savedJobs.map((job) => job.id));
  const toggleSavedJob = useCallback((job: UnifiedJob) => {
    setSavedJobs((current) => {
      const exists = current.some((item) => item.id === job.id);
      const next = exists ? current.filter((item) => item.id !== job.id) : [{ ...job, savedAt: new Date().toISOString() }, ...current];
      persistSavedJobs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleWorkModeChange = (val: string) => { setWorkMode(val); setPage(1); };
  const handleSourceChange = (val: SourceFilter) => { setSourceFilter(val); setPage(1); };

  const syncUrl = useCallback((p: number, s: string, wm: string, src: SourceFilter) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (s) params.set('search', s);
    if (wm) params.set('workMode', wm);
    if (src !== 'all') params.set('source', src);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname]);

  useEffect(() => { syncUrl(page, debounced, workMode, sourceFilter); }, [page, debounced, workMode, sourceFilter, syncUrl]);

  const { jobs, total, totalPages, sources, loading, validating, error, refresh } = useJobs({ search: debounced, workMode: workMode || undefined, source: sourceFilter, page, limit: PAGE_SIZE });
  const { applications, applyOptimistic } = useMyApplications();
  const getApp = (jobId: string) => applications.find((application) => getApplicationJobId(application) === jobId);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  const totalLive = sources.serpapi + sources.linkedin + sources.indeed;
  const handlePageChange = (newPage: number) => { setPage(newPage); };

  return (
    <section className="min-h-screen bg-[#070B14] text-[#F8FAFC] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
            <span className={`w-2 h-2 rounded-full ${validating ? 'bg-[#34D399] animate-pulse' : 'bg-[#34D399]/30'} transition-colors`} title="Live — updates in real time via SSE" />
          </div>
          {!loading && (
            <p className="text-sm text-[rgba(226,232,240,0.5)]">
              {total} openings ·{' '}
              <span className="text-[#A78BFA]">{sources.internal} recruiter</span> ·{' '}
              <span className="text-[#60A5FA]">{sources.serpapi} Google</span> ·{' '}
              <span className="text-[#38BDF8]">{sources.linkedin} LinkedIn</span> ·{' '}
              <span className="text-[#34D399]">{sources.indeed} Indeed</span> ·{' '}
              <span className="text-[10px] text-[rgba(226,232,240,0.3)]">{totalLive} live · {PAGE_SIZE} per page</span>
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(226,232,240,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs, companies, skills…" className="w-full bg-[#0D1424] border border-[rgba(255,255,255,0.12)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[rgba(226,232,240,0.3)] focus:outline-none focus:border-[rgba(167,139,250,0.5)] transition-colors" />
          </div>
          <select value={workMode} onChange={(e) => handleWorkModeChange(e.target.value)} className="bg-[#0D1424] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-2.5 text-sm text-[#E2E8F0] focus:outline-none focus:border-[rgba(167,139,250,0.5)] cursor-pointer">
            <option value="">All modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
          <div className="flex rounded-lg border border-[rgba(255,255,255,0.12)] overflow-hidden">
            {([
              { key: 'all', label: 'All' },
              { key: 'internal', label: 'Recruiter' },
              { key: 'serpapi', label: 'Google' },
              { key: 'linkedin', label: 'LinkedIn' },
              { key: 'indeed', label: 'Indeed' },
            ] as { key: SourceFilter; label: string }[]).map(({ key, label }, i, arr) => (
              <button key={key} onClick={() => handleSourceChange(key)} className={`px-4 py-2.5 text-xs font-semibold transition-colors ${sourceFilter === key ? 'bg-[rgba(167,139,250,0.1)] text-[#A78BFA]' : 'bg-transparent text-[rgba(226,232,240,0.68)] hover:bg-[rgba(255,255,255,0.05)]'} ${i < arr.length - 1 ? 'border-r border-[rgba(255,255,255,0.12)]' : ''}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={refresh} disabled={validating} className="flex items-center gap-2 px-4 py-2.5 bg-[#0D1424] border border-[rgba(255,255,255,0.12)] rounded-lg text-xs font-semibold text-[rgba(226,232,240,0.68)] hover:bg-[rgba(255,255,255,0.05)] transition-colors disabled:opacity-50">
            <span className={`inline-block ${validating ? 'animate-spin' : ''}`}>↻</span>
            {validating ? 'Updating…' : 'Refresh'}
          </button>
        </div>

        {/* Saved jobs strip */}
        {savedJobs.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-xs text-[rgba(226,232,240,0.5)]">Saved:</span>
            <a href="/saved-jobs" className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(52,211,153,0.1)] text-[#34D399] border border-[rgba(52,211,153,0.2)] hover:bg-[rgba(52,211,153,0.2)] transition-colors">
              {savedJobs.length} saved job{savedJobs.length > 1 ? 's' : ''}
            </a>
          </div>
        )}

        {/* My applications status strip */}
        {applications.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-xs text-[rgba(226,232,240,0.5)]">My applications:</span>
            {Object.entries(applications.reduce<Record<string, number>>((acc, app) => {
              const normalizedStatus = normalizeApplicationStatus(app.status);
              acc[normalizedStatus] = (acc[normalizedStatus] ?? 0) + 1;
              return acc;
            }, {})).map(([status, count]) => {
              const b = APP_BADGE[status];
              if (!b) return null;
              return <span key={status} className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${b.bg} ${b.color}`}>{b.label} ({count})</span>;
            })}
          </div>
        )}

        {/* Job grid */}
        {error ? (
          <div className="bg-[#0D1424] border border-[rgba(248,113,113,0.2)] rounded-2xl p-10 text-center">
            <p className="text-[#F87171] text-sm mb-4">{error}</p>
            <button className="px-6 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] rounded-lg text-sm font-semibold hover:bg-[rgba(255,255,255,0.1)] transition-colors" onClick={refresh}>Retry</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-[rgba(226,232,240,0.68)] text-lg font-medium mb-2">No jobs found</p>
            <p className="text-[rgba(226,232,240,0.3)] text-sm">Try adjusting your filters or search terms. Jobs are synced from external platforms every 6 hours.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} application={getApp(job.id)} onApply={setApplyTarget} saved={savedIds.has(job.id)} onToggleSave={toggleSavedJob} />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={handlePageChange} loading={validating} />
          </>
        )}

        {applyTarget && (
          <ApplyModal job={applyTarget} onClose={() => setApplyTarget(null)} onSuccess={applyOptimistic} />
        )}
      </div>
    </section>
  );
}