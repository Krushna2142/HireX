'use client';

import { useState } from 'react';
import {
  useRecruiterJobs,
  useJobApplicants,
  type RecruiterJob,
  type ApplicationStatus,
} from '@/hooks/useRealTimeAlerts';
import { Application } from '@/hooks/useRealTimeAlerts';

// ── Skill taxonomy ────────────────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, string[]> = {
  'Frontend':       ['React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'CSS', 'HTML'],
  'Backend':        ['Node.js', 'NestJS', 'Express', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Go', 'Rust'],
  'Database':       ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Supabase', 'Prisma'],
  'Cloud & DevOps': ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  'AI / ML':        ['Python', 'TensorFlow', 'PyTorch', 'LangChain', 'OpenAI API', 'Hugging Face', 'MLOps'],
  'Tools':          ['Git', 'GraphQL', 'REST', 'gRPC', 'Kafka', 'RabbitMQ', 'Figma', 'Jira'],
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'jobs' | 'post';

interface PostJobForm {
  title:           string;
  location:        string;
  work_mode:       string;
  employment_type: string;
  description:     string;
  required_skills: string[];
  salary_min:      string;
  salary_max:      string;
}

const EMPTY_FORM: PostJobForm = {
  title: '', location: '', work_mode: 'hybrid', employment_type: 'full_time',
  description: '', required_skills: [], salary_min: '', salary_max: '',
};

// ── Style maps ────────────────────────────────────────────────────────────────

const JOB_STATUS_STYLE: Record<RecruiterJob['status'], { bg: string; color: string; border: string }> = {
  active: { bg: 'rgba(52,211,153,0.1)',   color: '#34D399', border: 'rgba(52,211,153,0.25)'   },
  closed: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
  draft:  { bg: 'rgba(251,191,36,0.1)',   color: '#FBBF24', border: 'rgba(251,191,36,0.25)'   },
};

const APP_STATUS: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', label: 'Applied'     },
  reviewed:    { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewed'    },
  reviewing:   { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewing'   },
  shortlisted: { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', label: 'Shortlisted' },
  interview:   { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', label: 'Interview'   },
  offered:     { bg: 'rgba(52,211,153,0.15)', color: '#10B981', label: 'Offered'     },
  rejected:    { bg: 'rgba(248,113,113,0.1)', color: '#F87171', label: 'Rejected'    },
  hired:       { bg: 'rgba(52,211,153,0.2)',  color: '#059669', label: 'Hired'       },
};

// ── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13, outline: 'none',
  fontFamily: 'Sora, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 7,
};

// ── SkillPicker ───────────────────────────────────────────────────────────────

function SkillPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [custom,  setCustom]  = useState('');
  const [openCat, setOpenCat] = useState<string | null>('Frontend');

  const toggle = (skill: string) =>
    onChange(selected.includes(skill)
      ? selected.filter((s: string) => s !== skill)
      : [...selected, skill]);

  const addCustom = () => {
    const s = custom.trim();
    if (s && !selected.includes(s)) { onChange([...selected, s]); setCustom(''); }
  };

  return (
    <div>
      {Object.entries(SKILL_CATEGORIES).map(([cat, skills]) => {
        const count  = skills.filter((s: string) => selected.includes(s)).length;
        const isOpen = openCat === cat;

        return (
          <div key={cat} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpenCat(isOpen ? null : cat)}
              style={{
                width: '100%', padding: '10px 14px', background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', fontFamily: 'Sora, sans-serif',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#A78BFA' : 'rgba(255,255,255,0.55)' }}>
                {cat}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>
                    {count} selected
                  </span>
                )}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </div>
            </button>

            {isOpen && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map((skill: string) => {
                  const checked = selected.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggle(skill)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${checked ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        background: checked ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                        color: checked ? '#C4B5FD' : 'rgba(255,255,255,0.45)',
                        fontSize: 12, fontWeight: checked ? 600 : 400,
                        fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${checked ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`,
                        background: checked ? '#A78BFA' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {skill}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom skill */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Add custom skill and press Enter"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="button" onClick={addCustom} style={{
          padding: '9px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif',
        }}>
          Add
        </button>
      </div>

      {/* Selected preview */}
      {selected.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Selected ({selected.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {selected.map((skill: string) => (
              <span key={skill} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#C4B5FD',
              }}>
                {skill}
                <button type="button" onClick={() => toggle(skill)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', fontSize: 13, lineHeight: 1, padding: '0 0 0 2px', opacity: 0.6,
                }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const [tab,          setTab]     = useState<Tab>('jobs');
  const [selectedJobId, setJobId]  = useState<string | null>(null);
  const [form,         setForm]    = useState<PostJobForm>(EMPTY_FORM);
  const [formError,    setErr]     = useState<string | null>(null);
  const [postSuccess,  setSuccess] = useState(false);
  const [posting,      setPosting] = useState(false);

  // ── Real-time hooks ───────────────────────────────────────────────────────
  const { jobs, loading: loadingJobs, validating, postJob, toggleStatus } = useRecruiterJobs();
  const { applicants, loading: loadingApps, updateStatus } = useJobApplicants(selectedJobId);

  // selectedJob is typed as RecruiterJob | undefined — no 'as any' needed
  const selectedJob: RecruiterJob | undefined = jobs.find((j: { id: string | null; }) => j.id === selectedJobId);

  // ── Post job handler ──────────────────────────────────────────────────────
  const handlePost = async () => {
    setErr(null);
    if (!form.title.trim() || !form.location.trim() || !form.description.trim()) {
      setErr('Title, location and description are required.'); return;
    }
    if (form.required_skills.length === 0) {
      setErr('Select at least one required skill.'); return;
    }
    setPosting(true);
    try {
      await postJob({
        title:          form.title.trim(),
        location:       form.location.trim(),
        workMode:       form.work_mode,
        employmentType: form.employment_type,
        description:    form.description.trim(),
        requiredSkills: form.required_skills,
        salaryMin:      form.salary_min ? parseInt(form.salary_min, 10) : undefined,
        salaryMax:      form.salary_max ? parseInt(form.salary_max, 10) : undefined,
      });
      setSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => { setSuccess(false); setTab('jobs'); }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to post job.';
      setErr(msg);
    } finally {
      setPosting(false);
    }
  };

  const f = <K extends keyof PostJobForm>(key: K, val: PostJobForm[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalApplicants = jobs.reduce((n: number, j: RecruiterJob) => n + j._count.applications, 0);
  const activeJobs      = jobs.filter((j: RecruiterJob) => j.status === 'active').length;

  return (
    <>
      <style>{`
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes raSpin  { to { transform:rotate(360deg); } }
        @keyframes rdFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0F1526; color: #F1F5F9; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* ── Header ── */}
        <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Recruitment</h1>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                  background: validating ? '#34D399' : 'rgba(52,211,153,0.3)',
                  boxShadow: validating ? '0 0 5px #34D399' : 'none',
                  transition: 'background 0.3s',
                }} />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                Manage postings and review applicants · live
              </p>
            </div>
            <button
              onClick={() => { setTab('post'); setJobId(null); }}
              style={{
                padding: '9px 20px', background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10,
                color: '#A78BFA', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> Post a Job
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
            {([ 
              { label: 'Total posted',     value: jobs.length,      color: '#A78BFA' },
              { label: 'Active',           value: activeJobs,       color: '#34D399' },
              { label: 'Total applicants', value: totalApplicants,  color: '#60A5FA' },
            ] as const).map(({ label, value, color }) => (
              <div key={label} style={{ padding: '12px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {(['jobs', 'post'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: tab === t ? 700 : 400,
                  background: tab === t ? 'rgba(167,139,250,0.2)' : 'transparent',
                  color: tab === t ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                  border: tab === t ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent',
                  cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                }}
              >
                {t === 'jobs' ? 'My Jobs' : 'Post New Job'}
              </button>
            ))}
          </div>
        </div>

        {/* ── JOBS TAB ── */}
        {tab === 'jobs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 'calc(100vh - 220px)' }}>

            {/* Job list */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0B0F1C', overflowY: 'auto' }}>
              {loadingJobs ? (
                <div style={{ padding: '0.75rem' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'raPulse 1.4s ease infinite' }} />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>No jobs posted yet</p>
                  <button onClick={() => setTab('post')} style={{ fontSize: 13, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Sora, sans-serif' }}>
                    Post your first job →
                  </button>
                </div>
              ) : (
                <div style={{ padding: '0.75rem' }}>
                  {jobs.map((job: RecruiterJob) => {
                    const isSel = selectedJobId === job.id;
                    const st    = JOB_STATUS_STYLE[job.status];
                    return (
                      <button
                        key={job.id}
                        onClick={() => setJobId(job.id)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '12px 14px',
                          borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                          border: `1px solid ${isSel ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`,
                          background: isSel ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                          fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSel ? '#C4B5FD' : 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {job.title}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                              {job.location} · {job.workMode}
                            </p>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                            {job.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: job._count.applications > 0 ? '#60A5FA' : 'rgba(255,255,255,0.25)' }}>
                            {job._count.applications} applicants
                          </span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                            {new Date(job.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Job detail + applicants */}
            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto' }}>
              {!selectedJob ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', flexDirection: 'column', gap: 8 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4">
                    <rect x="5" y="5" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="12" y1="15" x2="28" y2="15" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="12" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="12" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <p style={{ fontSize: 14, margin: 0 }}>Select a job to view applicants</p>
                </div>
              ) : (
                <div style={{ maxWidth: 740, animation: 'rdFade 0.3s ease' }}>

                  {/* Job summary card */}
                  <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' }}>{selectedJob.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          {selectedJob.location} · {selectedJob.workMode} · {selectedJob.employmentType?.replace('_', ' ')}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleStatus(selectedJob.id, selectedJob.status)}
                        style={{
                          flexShrink: 0, fontSize: 12, padding: '7px 16px',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                          fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                        }}
                      >
                        {selectedJob.status === 'active' ? 'Close listing' : 'Reopen listing'}
                      </button>
                    </div>

                    {selectedJob.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '1rem' }}>
                        {selectedJob.requiredSkills.map((s: string) => (
                          <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <p style={{ margin: '1rem 0 0', fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)' }}>
                      {selectedJob.description.slice(0, 300)}{selectedJob.description.length > 300 && '…'}
                    </p>
                  </div>

                  {/* Applicants */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>Applicants</p>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{applicants.length} total</span>
                  </div>

                  {loadingApps && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2].map(i => (
                        <div key={i} style={{ height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />
                      ))}
                    </div>
                  )}

                  {!loadingApps && applicants.length === 0 && (
                    <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>No applications yet</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {applicants.map((app: Application) => {
                      const ast = APP_STATUS[app.status] ?? APP_STATUS.applied;
                      return (
                        <div
                          key={app.id}
                          style={{ padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {app.candidate?.name?.slice(0, 2).toUpperCase() ?? 'C'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidate?.name ?? 'Candidate'}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                              {app.candidate?.email} · Applied {fmtDate(app.applied_at)}
                            </p>
                          </div>
                          <select
                            value={app.status}
                            onChange={e => updateStatus(app.id, e.target.value as ApplicationStatus)}
                            style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: `1px solid ${ast.color}40`, background: ast.bg, color: ast.color, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}
                          >
                            {(Object.entries(APP_STATUS) as [ApplicationStatus, typeof APP_STATUS[ApplicationStatus]][]).map(([val, cfg]) => (
                              <option key={val} value={val}>{cfg.label}</option>
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

        {/* ── POST JOB TAB ── */}
        {tab === 'post' && (
          <div style={{ padding: '2rem', maxWidth: 760, margin: '0 auto', animation: 'rdFade 0.3s ease' }}>
            <div style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220' }}>
              <p style={{ margin: '0 0 1.75rem', fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                Post a New Job
              </p>

              {formError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '1.25rem' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{formError}</p>
                </div>
              )}

              {postSuccess && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎉</span>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#34D399' }}>Job posted! Candidates can now see and apply.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Title */}
                <div>
                  <label style={labelStyle}>Job title *</label>
                  <input type="text" value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={inputStyle} />
                </div>

                {/* Location + Work mode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Location *</label>
                    <input type="text" value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Bangalore, India" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Work mode</label>
                    <select value={form.work_mode} onChange={e => f('work_mode', e.target.value)} style={inputStyle}>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </div>
                </div>

                {/* Employment type toggle */}
                <div>
                  <label style={labelStyle}>Employment type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['full_time', 'contract', 'part_time', 'internship'] as const).map(val => {
                      const labels: Record<string, string> = { full_time: 'Full-time', contract: 'Contract', part_time: 'Part-time', internship: 'Internship' };
                      const sel = form.employment_type === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => f('employment_type', val)}
                          style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: sel ? 700 : 400,
                            border: `1px solid ${sel ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            background: sel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                            color: sel ? '#A78BFA' : 'rgba(255,255,255,0.45)', cursor: 'pointer',
                            fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                          }}
                        >
                          {labels[val]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Salary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Salary min (₹)</label>
                    <input type="number" value={form.salary_min} onChange={e => f('salary_min', e.target.value)} placeholder="e.g. 1500000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Salary max (₹)</label>
                    <input type="number" value={form.salary_max} onChange={e => f('salary_max', e.target.value)} placeholder="e.g. 2500000" style={inputStyle} />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>Job description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => f('description', e.target.value)}
                    rows={5}
                    placeholder="Describe the role, responsibilities, and ideal candidate…"
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties}
                  />
                </div>

                {/* Skills */}
                <div>
                  <label style={labelStyle}>Required skills *</label>
                  <SkillPicker
                    selected={form.required_skills}
                    onChange={skills => f('required_skills', skills)}
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handlePost}
                  disabled={posting}
                  style={{
                    width: '100%', padding: '13px',
                    background: posting ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))',
                    border: posting ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(124,58,237,0.5)',
                    borderRadius: 12, color: posting ? 'rgba(255,255,255,0.3)' : '#fff',
                    fontSize: 14, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer',
                    fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {posting && (
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
                  )}
                  {posting ? 'Posting…' : 'Post Job → Notify Candidates'}
                </button>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>
                  Candidates matching your required skills will be notified automatically
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}