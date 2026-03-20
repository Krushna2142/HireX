'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/recruiter/dashboard/page.tsx
//
// Changes from the original (document 9) — minimal diff:
//   1. Added: import { ProfilePanel } from '@/components/ProfilePanel'
//   2. Added: <ProfilePanel /> at the bottom of the JSX tree
//   3. The "⚙ Profile" button in the header now calls openPanel() from context
//
// Everything else — DashboardTab, SkillPicker, PostJobForm, job list,
// applicant management, tab structure — is preserved exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useRecruiterJobs,
  useJobApplicants,
  type RecruiterJob,
  type ApplicationStatus,
  type Application,
} from '@/hooks/useRealTimeAlerts';
import { useRecruiterAnalytics } from '@/hooks/useAnalytics';
import { useProfilePanel }       from '@/components/context/ProfilePanelContext';
import { ProfilePanel }          from '@/components/profile/ProfilePanel';

// ── Skill taxonomy ─────────────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, string[]> = {
  'Frontend':       ['React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'CSS', 'HTML'],
  'Backend':        ['Node.js', 'NestJS', 'Express', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Go', 'Rust'],
  'Database':       ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Supabase', 'Prisma'],
  'Cloud & DevOps': ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  'AI / ML':        ['Python', 'TensorFlow', 'PyTorch', 'LangChain', 'OpenAI API', 'Hugging Face', 'MLOps'],
  'Mobile':         ['Flutter', 'React Native', 'Swift', 'Kotlin', 'iOS', 'Android'],
  'Tools':          ['Git', 'GraphQL', 'REST', 'gRPC', 'Kafka', 'Figma', 'Jira'],
};

type Tab = 'dashboard' | 'jobs' | 'post';

interface PostJobForm {
  title: string; company: string; location: string;
  work_mode: string; employment_type: string;
  description: string; required_skills: string[];
  salary_min: string; salary_max: string;
}

const EMPTY_FORM: PostJobForm = {
  title: '', company: '', location: '', work_mode: 'hybrid',
  employment_type: 'full_time', description: '',
  required_skills: [], salary_min: '', salary_max: '',
};

// ── Style constants ────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', label: 'Applied'     },
  reviewed:    { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewed'    },
  reviewing:   { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewing'   },
  shortlisted: { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', label: 'Shortlisted' },
  interview:   { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', label: 'Interview'   },
  offered:     { bg: 'rgba(52,211,153,0.15)', color: '#10B981', label: 'Offered'     },
  rejected:    { bg: 'rgba(248,113,113,0.1)', color: '#F87171', label: 'Rejected'    },
  hired:       { bg: 'rgba(52,211,153,0.2)',  color: '#059669', label: 'Hired'       },
};

const JOB_STATUS_STYLE: Record<RecruiterJob['status'], { bg: string; color: string; border: string }> = {
  active: { bg: 'rgba(52,211,153,0.1)',   color: '#34D399', border: 'rgba(52,211,153,0.25)'   },
  closed: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
  draft:  { bg: 'rgba(251,191,36,0.1)',   color: '#FBBF24', border: 'rgba(251,191,36,0.25)'   },
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13, outline: 'none',
  fontFamily: 'Sora, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', marginBottom: 7,
};

// ── Chart tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <div style={{ height: 28, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 4, animation: 'raPulse 1.4s ease infinite' }} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Dashboard analytics tab ────────────────────────────────────────────────

function DashboardTab() {
  const { analytics, loading } = useRecruiterAnalytics();
  const { kpis, applicationsByStatus, applicationsOverTime, topJobs, recentApplications, skillDemand } = analytics;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', animation: 'rdFade 0.3s ease' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <KpiCard label="Total Jobs Posted"  value={kpis.totalJobs}       color="#A78BFA" icon="💼" loading={loading} />
        <KpiCard label="Active Listings"    value={kpis.activeJobs}      color="#34D399" icon="✅" loading={loading} />
        <KpiCard label="Total Applicants"   value={kpis.totalApplicants} color="#60A5FA" icon="👥" loading={loading} />
        <KpiCard label="Shortlisted"        value={kpis.shortlisted}     color="#FBBF24" icon="⭐" loading={loading} />
        <KpiCard label="Hired"              value={kpis.hired}           color="#10B981" icon="🎉" loading={loading} />
        <KpiCard label="Avg. Time to Fill"  value={kpis.avgTimeToFill ? `${kpis.avgTimeToFill}d` : '—'} color="#F87171" icon="⏱️" sub="days from post to hire" loading={loading} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Applications Over Time</p>
          {applicationsOverTime.length === 0 && !loading
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={applicationsOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Applications" stroke="#A78BFA" strokeWidth={2} fill="url(#appGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {applicationsByStatus.length === 0 && !loading
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={applicationsByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="status">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {applicationsByStatus.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {applicationsByStatus.map((s: any) => (
                    <span key={s.status} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Top Jobs by Applicants</p>
          {topJobs.length === 0 && !loading
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topJobs} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="applicants"  name="Applicants"  fill="#60A5FA" radius={[0, 4, 4, 0]} barSize={8} />
                  <Bar dataKey="shortlisted" name="Shortlisted" fill="#34D399" radius={[0, 4, 4, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Most Required Skills</p>
          {skillDemand.length === 0 && !loading
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {skillDemand.slice(0, 6).map((s: any, i: number) => {
                  const pct = Math.round((s.count / (skillDemand[0]?.count || 1)) * 100);
                  return (
                    <div key={s.skill}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{s.skill}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.count} jobs</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `hsl(${260 - i * 20}, 70%, 70%)`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Recent applications */}
      <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Applications</p>
        {recentApplications.length === 0 && !loading
          ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>No applications yet</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentApplications.slice(0, 8).map((app: any) => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {app.candidateName?.slice(0, 2).toUpperCase() ?? 'C'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidateName}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{app.jobTitle} · {fmtDate(app.appliedAt)}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── SkillPicker (unchanged from original) ─────────────────────────────────

function SkillPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const [openCat, setOpenCat] = useState<string | null>('Frontend');
  const toggle = (skill: string) => onChange(selected.includes(skill) ? selected.filter(s => s !== skill) : [...selected, skill]);
  const addCustom = () => { const s = custom.trim(); if (s && !selected.includes(s)) { onChange([...selected, s]); setCustom(''); } };
  return (
    <div>
      {Object.entries(SKILL_CATEGORIES).map(([cat, skills]) => {
        const count  = skills.filter(s => selected.includes(s)).length;
        const isOpen = openCat === cat;
        return (
          <div key={cat} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpenCat(isOpen ? null : cat)} style={{ width: '100%', padding: '10px 14px', background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Sora, sans-serif' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#A78BFA' : 'rgba(255,255,255,0.55)' }}>{cat}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>{count} selected</span>}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map(skill => {
                  const checked = selected.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => toggle(skill)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'Sora, sans-serif', border: `1px solid ${checked ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: checked ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: checked ? '#C4B5FD' : 'rgba(255,255,255,0.45)', fontWeight: checked ? 600 : 400, transition: 'all 0.15s' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${checked ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`, background: checked ? '#A78BFA' : 'transparent' }}>
                        {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Add custom skill…" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={addCustom} style={{ padding: '9px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>Add</button>
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected ({selected.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {selected.map(skill => (
              <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#C4B5FD' }}>
                {skill}
                <button type="button" onClick={() => toggle(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13, lineHeight: 1, padding: '0 0 0 2px', opacity: 0.6 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const [tab,           setTab]    = useState<Tab>('dashboard');
  const [selectedJobId, setJobId]  = useState<string | null>(null);
  const [form,          setForm]   = useState<PostJobForm>(EMPTY_FORM);
  const [formError,     setErr]    = useState<string | null>(null);
  const [postSuccess,   setOk]     = useState(false);
  const [posting,       setPosting]= useState(false);

  const { openPanel }                                                       = useProfilePanel();
  const { jobs, loading: loadingJobs, validating, postJob, toggleStatus }   = useRecruiterJobs();
  const { applicants, loading: loadingApps, updateStatus }                  = useJobApplicants(selectedJobId);

  const selectedJob     = jobs.find(j => j.id === selectedJobId);
  const totalApplicants = jobs.reduce((n, j) => n + (j._count?.applications ?? 0), 0);
  const activeJobs      = jobs.filter(j => j.status === 'active').length;

  const handlePost = async () => {
    setErr(null);
    if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim()) { setErr('Title, company, location and description are required.'); return; }
    if (form.required_skills.length === 0) { setErr('Select at least one required skill.'); return; }
    setPosting(true);
    try {
      await postJob({ title: form.title.trim(), company: form.company.trim(), location: form.location.trim(), workMode: form.work_mode, employmentType: form.employment_type, description: form.description.trim(), requiredSkills: form.required_skills, salaryMin: form.salary_min ? parseInt(form.salary_min, 10) : undefined, salaryMax: form.salary_max ? parseInt(form.salary_max, 10) : undefined });
      setOk(true); setForm(EMPTY_FORM);
      setTimeout(() => { setOk(false); setTab('jobs'); }, 2000);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed to post job.'); }
    finally { setPosting(false); }
  };

  const f = <K extends keyof PostJobForm>(key: K, val: PostJobForm[K]) => setForm(p => ({ ...p, [key]: val }));
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'jobs',      label: '💼 My Jobs'   },
    { key: 'post',      label: '+ Post a Job' },
  ];

  return (
    <>
      <style>{`
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes raSpin  { to { transform:rotate(360deg); } }
        @keyframes rdFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0F1526; color: #F1F5F9; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Recruitment</h1>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: validating ? '#34D399' : 'rgba(52,211,153,0.3)', boxShadow: validating ? '0 0 5px #34D399' : 'none', transition: 'background 0.3s', display: 'inline-block' }} />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {jobs.length} jobs · {totalApplicants} applicants · {activeJobs} active · live
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {/* ← NEW: Profile & Settings button opens the panel */}
              <button
                onClick={openPanel}
                style={{ padding: '9px 16px', background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', borderRadius: 10, color: '#F472B6', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
              >
                ⚙ Profile &amp; Settings
              </button>

              <button
                onClick={() => setTab('post')}
                style={{ padding: '9px 20px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10, color: '#A78BFA', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Post a Job
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: tab === key ? 700 : 400, background: tab === key ? 'rgba(167,139,250,0.2)' : 'transparent', color: tab === key ? '#A78BFA' : 'rgba(255,255,255,0.4)', border: tab === key ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard tab */}
        {tab === 'dashboard' && <DashboardTab />}

        {/* Jobs tab */}
        {tab === 'jobs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', flex: 1, minHeight: 0 }}>
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0B0F1C', overflowY: 'auto' }}>
              {loadingJobs ? (
                <div style={{ padding: '0.75rem' }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'raPulse 1.4s ease infinite' }} />)}
                </div>
              ) : jobs.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>No jobs posted yet</p>
                  <button onClick={() => setTab('post')} style={{ fontSize: 13, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Sora, sans-serif' }}>Post your first job →</button>
                </div>
              ) : (
                <div style={{ padding: '0.75rem' }}>
                  {jobs.map(job => {
                    const isSel = selectedJobId === job.id;
                    const st    = JOB_STATUS_STYLE[job.status];
                    return (
                      <button key={job.id} onClick={() => setJobId(job.id)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: `1px solid ${isSel ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`, background: isSel ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSel ? '#C4B5FD' : 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{job.location} · {job.workMode}</p>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{job.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: (job._count?.applications ?? 0) > 0 ? '#60A5FA' : 'rgba(255,255,255,0.25)' }}>{job._count?.applications ?? 0} applicants</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(job.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto' }}>
              {!selectedJob ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', flexDirection: 'column', gap: 8 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4"><rect x="5" y="5" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="15" x2="28" y2="15" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.5"/></svg>
                  <p style={{ fontSize: 14, margin: 0 }}>Select a job to view applicants</p>
                </div>
              ) : (
                <div style={{ maxWidth: 740, animation: 'rdFade 0.3s ease' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' }}>{selectedJob.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{selectedJob.location} · {selectedJob.workMode} · {selectedJob.employmentType?.replace('_', ' ')}</p>
                      </div>
                      <button onClick={() => toggleStatus(selectedJob.id, selectedJob.status)} style={{ flexShrink: 0, fontSize: 12, padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: 'Sora, sans-serif' }}>
                        {selectedJob.status === 'active' ? 'Close listing' : 'Reopen listing'}
                      </button>
                    </div>
                    {selectedJob.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '1rem' }}>
                        {selectedJob.requiredSkills.map(s => <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}>{s}</span>)}
                      </div>
                    )}
                    <p style={{ margin: '1rem 0 0', fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)' }}>{selectedJob.description.slice(0, 300)}{selectedJob.description.length > 300 && '…'}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>Applicants</p>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{applicants.length} total</span>
                  </div>

                  {loadingApps && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1,2].map(i => <div key={i} style={{ height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />)}
                    </div>
                  )}

                  {!loadingApps && applicants.length === 0 && (
                    <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>No applications yet</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {applicants.map((app: Application) => {
                      const ast = STATUS_META[app.status] ?? STATUS_META.applied;
                      return (
                        <div key={app.id} style={{ padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {app.candidate?.name?.slice(0, 2).toUpperCase() ?? 'C'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidate?.name ?? 'Candidate'}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{app.candidate?.email} · Applied {fmtDate(app.applied_at)}</p>
                          </div>
                          <select value={app.status} onChange={e => updateStatus(app.id, e.target.value as ApplicationStatus)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: `1px solid ${ast.color}40`, background: ast.bg, color: ast.color, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                            {(Object.entries(STATUS_META) as [ApplicationStatus, (typeof STATUS_META)[ApplicationStatus]][]).map(([val, cfg]) => (
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

        {/* Post job tab */}
        {tab === 'post' && (
          <div style={{ padding: '2rem', maxWidth: 760, margin: '0 auto', width: '100%', animation: 'rdFade 0.3s ease' }}>
            <div style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220' }}>
              <p style={{ margin: '0 0 1.75rem', fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Post a New Job</p>

              {formError && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '1.25rem' }}><p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{formError}</p></div>}
              {postSuccess && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 18 }}>🎉</span><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#34D399' }}>Job posted! Candidates will be notified.</p></div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Job title *</label><input value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Company name *</label><input value={form.company} onChange={e => f('company', e.target.value)} placeholder="e.g. Razorpay" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Location *</label><input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Bangalore, India" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Work mode</label>
                    <select value={form.work_mode} onChange={e => f('work_mode', e.target.value)} style={inputStyle}>
                      <option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="onsite">Onsite</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Employment type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['full_time','contract','part_time','internship'] as const).map(val => {
                      const labels: Record<string,string> = { full_time:'Full-time', contract:'Contract', part_time:'Part-time', internship:'Internship' };
                      const sel = form.employment_type === val;
                      return (
                        <button key={val} type="button" onClick={() => f('employment_type', val)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: sel ? 700 : 400, border: `1px solid ${sel ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: sel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: sel ? '#A78BFA' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}>
                          {labels[val]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Salary min (₹)</label><input type="number" value={form.salary_min} onChange={e => f('salary_min', e.target.value)} placeholder="e.g. 1500000" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Salary max (₹)</label><input type="number" value={form.salary_max} onChange={e => f('salary_max', e.target.value)} placeholder="e.g. 2500000" style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Job description *</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={5} placeholder="Describe the role, responsibilities, and ideal candidate…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties} /></div>
                <div><label style={labelStyle}>Required skills *</label><SkillPicker selected={form.required_skills} onChange={skills => f('required_skills', skills)} /></div>
                <button onClick={handlePost} disabled={posting} style={{ width: '100%', padding: '13px', borderRadius: 12, background: posting ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))', border: posting ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(124,58,237,0.5)', color: posting ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 14, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                  {posting && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />}
                  {posting ? 'Posting…' : 'Post Job → Notify Candidates'}
                </button>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Candidates matching your required skills will be notified automatically</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ← Profile + Settings drawer (opened by username card in Sidebar or ⚙ button above) */}
      <ProfilePanel />
    </>
  );
}