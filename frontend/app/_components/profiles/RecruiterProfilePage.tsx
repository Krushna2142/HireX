'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  work_mode: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  description: string;
  required_skills: string[];
  salary_min?: number;
  salary_max?: number;
  status: 'active' | 'closed' | 'draft';
  created_at: string;
  _count?: { applications: number };
}

interface Applicant {
  id: string;
  status: 'applied' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
  applied_at: string;
  candidate: { id: string; name: string; email: string };
  resume?: { id: string; file_name?: string };
}

interface PostJobForm {
  title: string; location: string; work_mode: string;
  employment_type: string; description: string;
  required_skills: string; salary_min: string; salary_max: string;
}

type Tab = 'jobs' | 'post';

const EMPTY_FORM: PostJobForm = {
  title: '', location: '', work_mode: 'hybrid',
  employment_type: 'full_time', description: '',
  required_skills: '', salary_min: '', salary_max: '',
};

const JOB_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active: { bg: '#EAF3DE', color: '#3B6D11' },
  closed: { bg: '#F1EFE8', color: '#5F5E5A' },
  draft:  { bg: '#FAEEDA', color: '#854F0B' },
};

const APP_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  applied:     { bg: '#E6F1FB', color: '#0C447C' },
  reviewing:   { bg: '#FAEEDA', color: '#854F0B' },
  shortlisted: { bg: '#EAF3DE', color: '#3B6D11' },
  rejected:    { bg: '#FCEBEB', color: '#A32D2D' },
  hired:       { bg: '#E1F5EE', color: '#0F6E56' },
};

export default function RecruiterDashboard() {
  const [tab, setTab]               = useState<Tab>('jobs');
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [selectedJob, setJob]       = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingJobs, setLoadJobs]  = useState(true);
  const [loadingApps, setLoadApps]  = useState(false);
  const [posting, setPosting]       = useState(false);
  const [form, setForm]             = useState<PostJobForm>(EMPTY_FORM);
  const [formError, setFormError]   = useState<string | null>(null);
  const [postSuccess, setSuccess]   = useState(false);

  useEffect(() => {
    // ✅ no /api/ prefix
    api.get<Job[]>('/jobs/mine')
      .then(({ data }) => {
        setJobs(data);
        const activeJobs    = data.filter(j => j.status === 'active').length;
        const newApplicants = data.reduce((n, j) => n + (j._count?.applications ?? 0), 0);
        try { localStorage.setItem('jc_recruiter_stats', JSON.stringify({ activeJobs, newApplicants })); } catch {}
      })
      .catch(() => {})
      .finally(() => setLoadJobs(false));
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setLoadApps(true);
    // ✅ no /api/ prefix
    api.get<Applicant[]>(`/jobs/${selectedJob.id}/applicants`)
      .then(({ data }) => setApplicants(data))
      .catch(() => setApplicants([]))
      .finally(() => setLoadApps(false));
  }, [selectedJob]);

  const handlePost = async () => {
    setFormError(null);
    if (!form.title.trim() || !form.location.trim() || !form.description.trim()) {
      setFormError('Title, location, and description are required.');
      return;
    }
    setPosting(true);
    try {
      // ✅ no /api/ prefix
      const { data: newJob } = await api.post<Job>('/jobs', {
        title:           form.title.trim(),
        location:        form.location.trim(),
        work_mode:       form.work_mode,
        employment_type: form.employment_type,
        description:     form.description.trim(),
        required_skills: form.required_skills.split(',').map(s => s.trim()).filter(Boolean),
        salary_min:      form.salary_min ? parseInt(form.salary_min) : undefined,
        salary_max:      form.salary_max ? parseInt(form.salary_max) : undefined,
        status:          'active',
      });
      setJobs(prev => [newJob, ...prev]);
      setSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => { setSuccess(false); setTab('jobs'); }, 1800);
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to post job.');
    } finally {
      setPosting(false);
    }
  };

  const updateAppStatus = async (appId: string, status: string) => {
    try {
      // ✅ no /api/ prefix
      await api.patch(`/jobs/applications/${appId}/status`, { status });
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: status as Applicant['status'] } : a));
    } catch {}
  };

  const toggleJobStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    try {
      // ✅ no /api/ prefix
      await api.patch(`/jobs/${job.id}/status`, { status: newStatus });
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
      if (selectedJob?.id === job.id) setJob(prev => prev ? { ...prev, status: newStatus } : prev);
    } catch {}
  };

  const f = (key: keyof PostJobForm, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalApplicants = jobs.reduce((n, j) => n + (j._count?.applications ?? 0), 0);
  const activeJobs      = jobs.filter(j => j.status === 'active').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>Recruitment</h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Manage job postings and review applicants</p>
          </div>
          <button onClick={() => { setTab('post'); setJob(null); }}
            style={{ padding: '0.625rem 1.25rem', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Post a Job
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem' }}>
          {[{ label: 'Total posted', value: jobs.length }, { label: 'Active', value: activeJobs }, { label: 'Total applicants', value: totalApplicants }].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '0.75rem 1.25rem' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          {(['jobs', 'post'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.625rem 1.25rem', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--color-text-primary)' : '2px solid transparent', fontSize: 14, fontWeight: tab === t ? 500 : 400, color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', cursor: 'pointer', marginBottom: -1 }}>
              {t === 'jobs' ? 'My Jobs' : 'Post New Job'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'jobs' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 'calc(100vh - 220px)' }}>
          <div style={{ background: 'var(--color-background-primary)', borderRight: '0.5px solid var(--color-border-tertiary)', overflowY: 'auto' }}>
            {loadingJobs ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading...</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>No jobs posted yet</p>
                <button onClick={() => setTab('post')} style={{ fontSize: 13, color: 'var(--color-text-info)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Post your first job →</button>
              </div>
            ) : jobs.map(job => {
              const isSel = selectedJob?.id === job.id;
              const st    = JOB_STATUS_STYLE[job.status] ?? JOB_STATUS_STYLE.draft;
              return (
                <button key={job.id} onClick={() => setJob(job)} style={{ width: '100%', textAlign: 'left', padding: '1rem 1.25rem', background: isSel ? 'var(--color-background-secondary)' : 'transparent', borderBottom: '0.5px solid var(--color-border-tertiary)', borderLeft: isSel ? '3px solid var(--color-text-primary)' : '3px solid transparent', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{job.location} · {job.work_mode}</p>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 11, padding: '2px 8px', borderRadius: 20, ...st }}>{job.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{job._count?.applications ?? 0} applicants</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Posted {formatDate(job.created_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ padding: '2rem', overflowY: 'auto' }}>
            {!selectedJob ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)' }}>
                <p style={{ fontSize: 14 }}>Select a job to view applicants</p>
              </div>
            ) : (
              <div style={{ maxWidth: 740 }}>
                <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>{selectedJob.title}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{selectedJob.location} · {selectedJob.work_mode} · {selectedJob.employment_type?.replace('_', ' ')}</p>
                    </div>
                    <button onClick={() => toggleJobStatus(selectedJob)} style={{ flexShrink: 0, fontSize: 13, padding: '6px 14px', background: 'none', border: '0.5px solid var(--color-border-secondary)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      {selectedJob.status === 'active' ? 'Close listing' : 'Reopen listing'}
                    </button>
                  </div>
                  {selectedJob.required_skills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: '1rem' }}>
                      {selectedJob.required_skills.map(s => <span key={s} style={{ fontSize: 12, padding: '3px 10px', background: '#E6F1FB', color: '#0C447C', borderRadius: 20 }}>{s}</span>)}
                    </div>
                  )}
                  <p style={{ margin: '1rem 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                    {selectedJob.description.slice(0, 300)}{selectedJob.description.length > 300 && '...'}
                  </p>
                </div>

                <p style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>Applicants ({applicants.length})</p>
                {loadingApps && <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Loading applicants...</div>}
                {!loadingApps && applicants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12 }}>
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>No applications yet</p>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {applicants.map(app => {
                    const ast = APP_STATUS_STYLE[app.status] ?? APP_STATUS_STYLE.applied;
                    return (
                      <div key={app.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E6F1FB', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
                          {app.candidate.name?.slice(0, 2).toUpperCase() ?? 'C'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{app.candidate.name}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{app.candidate.email} · Applied {formatDate(app.applied_at)}</p>
                        </div>
                        <select value={app.status} onChange={e => updateAppStatus(app.id, e.target.value)}
                          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: ast.bg, color: ast.color, cursor: 'pointer' }}>
                          {['applied','reviewing','shortlisted','rejected','hired'].map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'post' && (
        <div style={{ padding: '2rem', maxWidth: 680, margin: '0 auto' }}>
          <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '2rem' }}>
            <p style={{ margin: '0 0 1.5rem', fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>Post a New Job</p>
            {formError && <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '0.75rem 1rem', fontSize: 14, color: '#A32D2D', marginBottom: '1.25rem' }}>{formError}</div>}
            {postSuccess && <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: 8, padding: '0.75rem 1rem', fontSize: 14, color: '#3B6D11', marginBottom: '1.25rem' }}>Job posted! Candidates can now see it in their Jobs tab.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Job title *</label>
                <input type="text" value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Location *</label>
                  <input type="text" value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Bangalore, India" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Work mode</label>
                  <select value={form.work_mode} onChange={e => f('work_mode', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Employment type</label>
                <select value={form.employment_type} onChange={e => f('employment_type', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Salary min (₹)</label>
                  <input type="number" value={form.salary_min} onChange={e => f('salary_min', e.target.value)} placeholder="e.g. 1500000" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Salary max (₹)</label>
                  <input type="number" value={form.salary_max} onChange={e => f('salary_max', e.target.value)} placeholder="e.g. 2500000" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Required skills (comma separated)</label>
                <input type="text" value={form.required_skills} onChange={e => f('required_skills', e.target.value)} placeholder="e.g. React, TypeScript, Node.js" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Job description *</label>
                <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={6} placeholder="Describe the role, responsibilities…" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <button onClick={handlePost} disabled={posting} style={{ width: '100%', padding: '0.875rem', background: posting ? 'var(--color-background-secondary)' : 'var(--color-text-primary)', color: posting ? 'var(--color-text-secondary)' : 'var(--color-background-primary)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: posting ? 'not-allowed' : 'pointer' }}>
                {posting ? 'Posting...' : 'Post Job'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>Once posted, candidates immediately see this in their Jobs tab</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}