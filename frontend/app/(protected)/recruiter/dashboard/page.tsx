'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/recruiter/dashboard/page.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import api from '@/lib/axios';
import CandidateDetailsDrawer from '@/components/recruiter/CandidateDetailsDrawer';

type TabKey =
  | 'overview'
  | 'jobs'
  | 'applications'
  | 'shortlisted'
  | 'schedule'
  | 'results';

type JobRow = {
  id: string;
  title: string;
  company?: string | null;
  companyName?: string | null;
  company_name?: string | null;
  location?: string | null;
  workMode?: string | null;
  work_mode?: string | null;
  employmentType?: string | null;
  employment_type?: string | null;
  requiredSkills?: string[] | string | null;
  required_skills?: string[] | string | null;
  status?: string | null;
  total_applications?: string | number | null;
  vacancies?: string | number | null;
  openings?: string | number | null;
  _count?: { applications?: number };
};

type ApplicationRow = {
  id: string;
  status: string;
  applied_at?: string;
  appliedAt?: string;
  created_at?: string;
  createdAt?: string;
  match_score?: number | null;

  ats_score?: number | null;
  ats_recommendation?: string | null;
  ats_matched_skills?: string[] | null;
  ats_missing_skills?: string[] | null;
  ats_reason?: string | null;
  ats_checked_at?: string | null;

  resumeUrl?: string | null;
  resume_url?: string | null;
  resumeFileUrl?: string | null;
  resume_file_url?: string | null;

  candidate?: {
    id?: string;
    name?: string;
    fullName?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    resumeUrl?: string | null;
    resume_url?: string | null;
    resumeFileUrl?: string | null;
    resume_file_url?: string | null;
    resume?: {
      url?: string | null;
      fileUrl?: string | null;
      file_url?: string | null;
      publicUrl?: string | null;
      public_url?: string | null;
      fileName?: string | null;
      file_name?: string | null;
    };
    skills?: string[];
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };

  resume?: {
    url?: string | null;
    fileUrl?: string | null;
    file_url?: string | null;
    publicUrl?: string | null;
    public_url?: string | null;
    fileName?: string | null;
    file_name?: string | null;
  };

  jobs?: {
    title?: string;
    company?: string;
    company_name?: string;
  };

  job?: {
    title?: string;
    companyName?: string;
    company_name?: string;
  };
};

type ScheduleResult = {
  interviewId: string;
  roundId?: string | null;
  joinUrl?: string | null;
};

type PostJobForm = {
  title: string;
  company: string;
  location: string;
  workMode: 'onsite' | 'hybrid' | 'remote';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'freelance';
  description: string;
  requiredSkills: string;
};

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
  panel3: '#111C2F',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(167,139,250,0.28)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  pink: '#F472B6',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
  orange: '#FB923C',
};

const IT_SKILL_GROUPS = [
  {
    label: 'Frontend / UI',
    skills: [
      'javascript',
      'typescript',
      'react',
      'next.js',
      'html',
      'css',
      'tailwind css',
      'redux',
      'zustand',
      'framer motion',
      'material ui',
      'shadcn ui',
      'responsive design',
      'web accessibility',
    ],
  },
  {
    label: 'Backend / APIs',
    skills: [
      'node.js',
      'express.js',
      'nestjs',
      'java',
      'spring boot',
      'python',
      'fastapi',
      'django',
      'rest api',
      'graphql',
      'websocket',
      'microservices',
      'authentication',
      'jwt',
      'oauth',
    ],
  },
  {
    label: 'Databases / Storage',
    skills: [
      'postgresql',
      'mysql',
      'mongodb',
      'redis',
      'supabase',
      'firebase',
      'prisma',
      'sql',
      'database design',
      'query optimization',
      'database indexing',
    ],
  },
  {
    label: 'Cloud / DevOps',
    skills: [
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'google cloud',
      'vercel',
      'render',
      'linux',
      'nginx',
      'ci/cd',
      'github actions',
      'monitoring',
      'logging',
      'load balancing',
    ],
  },
  {
    label: 'Testing / Quality',
    skills: [
      'unit testing',
      'integration testing',
      'e2e testing',
      'jest',
      'playwright',
      'cypress',
      'postman',
      'api testing',
      'debugging',
      'performance testing',
    ],
  },
  {
    label: 'Mobile / Cross Platform',
    skills: [
      'react native',
      'flutter',
      'dart',
      'android',
      'kotlin',
      'swift',
      'mobile app development',
    ],
  },
  {
    label: 'AI / Data',
    skills: [
      'machine learning',
      'deep learning',
      'nlp',
      'llm',
      'generative ai',
      'python data science',
      'pandas',
      'numpy',
      'scikit-learn',
      'tensorflow',
      'pytorch',
      'spacy',
      'opencv',
      'langchain',
      'langgraph',
      'vector database',
      'rag',
      'prompt engineering',
    ],
  },
  {
    label: 'Security',
    skills: [
      'cybersecurity',
      'owasp',
      'secure coding',
      'penetration testing',
      'vulnerability assessment',
      'encryption',
      'network security',
      'access control',
    ],
  },
  {
    label: 'Tools / Workflow',
    skills: [
      'git',
      'github',
      'gitlab',
      'jira',
      'figma',
      'agile',
      'scrum',
      'technical documentation',
      'system design',
      'problem solving',
    ],
  },
] as const;

const FLOW_STAGES = [
  'Applied',
  'ATS Checked',
  'Shortlisted',
  'Scheduled',
  'Interview',
  'Feedback',
  'Hired',
];

const ATS_FILTERS = [
  { key: 'all', label: 'All Candidates' },
  { key: 'unchecked', label: 'ATS Pending' },
  { key: 'shortlist', label: 'Shortlist Recommended' },
  { key: 'review', label: 'Review Needed' },
  { key: 'rejected', label: 'Rejected' },
] as const;

type AtsFilter = (typeof ATS_FILTERS)[number]['key'];

function toArray<T>(raw: unknown, key?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  const keys = ['data', 'items', 'results', 'jobs', 'applicants', key].filter(
    Boolean,
  ) as string[];

  for (const candidate of keys) {
    const value = obj[candidate];

    if (Array.isArray(value)) return value as T[];

    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;

      if (Array.isArray(nested.data)) return nested.data as T[];
      if (Array.isArray(nested.items)) return nested.items as T[];
      if (Array.isArray(nested.results)) return nested.results as T[];
      if (Array.isArray(nested.jobs)) return nested.jobs as T[];
      if (Array.isArray(nested.applicants)) return nested.applicants as T[];
    }
  }

  return [];
}

function safeString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeUpper(value: unknown, fallback = ''): string {
  return safeString(value, fallback).toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string): string {
  const anyError = error as any;
  const raw =
    anyError?.response?.data?.detail ??
    anyError?.response?.data?.message ??
    anyError?.response?.data?.error ??
    anyError?.message ??
    fallback;

  return safeString(raw, fallback);
}

function isErrorMessage(message: string | null) {
  const value = safeString(message).toLowerCase();

  return (
    value.includes('failed') ||
    value.includes('unable') ||
    value.includes('error') ||
    value.includes('required') ||
    value.includes('select')
  );
}

function normalizeStatus(status?: string | null) {
  return safeString(status, 'applied').replace(/_/g, ' ').toLowerCase();
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

function getCompany(job?: JobRow | null) {
  return safeString(
    job?.companyName ?? job?.company_name ?? job?.company,
    'Your company',
  );
}

function getWorkMode(job?: JobRow | null) {
  return safeString(job?.workMode ?? job?.work_mode, 'onsite');
}

function getEmploymentType(job?: JobRow | null) {
  return safeString(job?.employmentType ?? job?.employment_type, 'full_time');
}

function getRequiredSkills(job?: JobRow | null) {
  const raw = job?.requiredSkills ?? job?.required_skills ?? [];

  if (Array.isArray(raw)) {
    return raw
      .filter((skill): skill is string => typeof skill === 'string')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

function getApplicantCount(job?: JobRow | null) {
  const fromCount = Number(job?._count?.applications ?? 0);
  const fromTotal = Number(job?.total_applications ?? 0);

  if (Number.isFinite(fromCount) && fromCount > 0) return fromCount;
  if (Number.isFinite(fromTotal) && fromTotal > 0) return fromTotal;

  return 0;
}

function getCandidateName(app: ApplicationRow) {
  return safeString(
    app.candidate?.fullName ??
      app.candidate?.full_name ??
      app.candidate?.name ??
      app.candidate?.email,
    'Candidate',
  );
}

function getCandidateEmail(app: ApplicationRow) {
  return safeString(app.candidate?.email, 'No email shown');
}

function getAtsScore(app: ApplicationRow) {
  const score = Number(app.ats_score ?? app.match_score ?? 0);
  return Number.isFinite(score) ? Math.round(score) : 0;
}

function hasAts(app: ApplicationRow) {
  return app.ats_score !== null && app.ats_score !== undefined;
}

function getAtsRecommendation(app: ApplicationRow) {
  if (!hasAts(app)) return 'NOT_CHECKED';

  const direct = safeUpper(app.ats_recommendation, '');

  if (direct) return direct;

  const score = getAtsScore(app);

  if (score >= 75) return 'SHORTLIST';
  if (score >= 55) return 'REVIEW';
  return 'REJECT';
}

function isRejected(app: ApplicationRow) {
  const status = normalizeStatus(app.status);
  const recommendation = getAtsRecommendation(app);

  return status.includes('reject') || recommendation === 'REJECT';
}

function isHired(app: ApplicationRow) {
  const status = normalizeStatus(app.status);

  return status.includes('hired') || status.includes('offer');
}

function isShortlisted(app: ApplicationRow) {
  const status = normalizeStatus(app.status);

  return status.includes('shortlist');
}

function isScheduled(app: ApplicationRow) {
  const status = normalizeStatus(app.status);

  return status.includes('scheduled') || status.includes('interview');
}

function isFeedbackDone(app: ApplicationRow) {
  const status = normalizeStatus(app.status);

  return status.includes('feedback') || status.includes('completed');
}

function isShortlistedPipeline(app: ApplicationRow) {
  return (
    isShortlisted(app) ||
    isScheduled(app) ||
    isFeedbackDone(app) ||
    isHired(app)
  );
}

function canScheduleApplication(app: ApplicationRow) {
  return isShortlistedPipeline(app) && !isRejected(app) && !isHired(app);
}

function getPipelineIndex(app: ApplicationRow) {
  const status = normalizeStatus(app.status);

  if (status.includes('hired') || status.includes('offer')) return 6;
  if (status.includes('feedback') || status.includes('completed')) return 5;
  if (status.includes('interview')) return 4;
  if (status.includes('scheduled')) return 3;
  if (status.includes('shortlist')) return 2;
  if (hasAts(app)) return 1;

  return 0;
}

function getFlowColor(app: ApplicationRow) {
  const status = normalizeStatus(app.status);
  const recommendation = getAtsRecommendation(app);

  if (status.includes('reject') || recommendation === 'REJECT') return C.red;
  if (status.includes('hired') || status.includes('offer')) return C.green;
  if (status.includes('interview') || status.includes('scheduled')) return C.purple;
  if (status.includes('shortlist') || recommendation === 'SHORTLIST') return C.yellow;
  if (hasAts(app)) return C.sky;

  return C.faint;
}

function getVacancyFromJob(job?: JobRow | null) {
  const fromVacancies = safeNumber(job?.vacancies, 0);
  const fromOpenings = safeNumber(job?.openings, 0);

  if (fromVacancies > 0) return fromVacancies;
  if (fromOpenings > 0) return fromOpenings;

  return 1;
}

function getRecommendedShortlistCount(vacancies: number, totalApplications: number) {
  const safeVacancies = Math.max(1, Math.round(vacancies || 1));

  const multiplier =
    safeVacancies <= 5
      ? 5
      : safeVacancies <= 25
        ? 4
        : 3;

  return Math.min(totalApplications, safeVacancies * multiplier);
}

function getCandidateRankLabel(index: number) {
  if (index === 0) return 'Top candidate';
  if (index < 5) return `Top ${index + 1}`;
  return `Rank ${index + 1}`;
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  task: (item: T, index: number) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);

    await Promise.all(
      batch.map((item, batchIndex) => task(item, index + batchIndex)),
    );
  }
}

function CandidateFlow({ app }: { app: ApplicationRow }) {
  const activeIndex = getPipelineIndex(app);
  const color = getFlowColor(app);

  return (
    <div style={candidateFlowStyle}>
      {FLOW_STAGES.map((stage, index) => {
        const done = index <= activeIndex;

        return (
          <div key={stage} style={flowItemStyle}>
            <span
              style={{
                ...flowDotStyle,
                background: done ? color : 'rgba(255,255,255,0.14)',
                boxShadow: done ? `0 0 12px ${color}` : 'none',
              }}
            >
              {done ? '✓' : ''}
            </span>

            <span style={{ color: done ? C.text : C.faint }}>{stage}</span>

            {index < FLOW_STAGES.length - 1 && (
              <i
                style={{
                  ...flowConnectorStyle,
                  background:
                    index < activeIndex ? color : 'rgba(255,255,255,0.10)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const s = normalizeStatus(status);
  let color = C.sky;

  if (s.includes('shortlist')) color = C.yellow;
  if (s.includes('interview') || s.includes('scheduled')) color = C.purple;
  if (s.includes('offer') || s.includes('hired')) color = C.green;
  if (s.includes('reject') || s.includes('fail')) color = C.red;

  return (
    <span
      style={{
        ...statusPillStyle,
        color,
        borderColor: `${color}55`,
        background: `${color}14`,
      }}
    >
      {s}
    </span>
  );
}

function AtsRecommendationPill({ app }: { app: ApplicationRow }) {
  const recommendation = getAtsRecommendation(app);
  let color = C.faint;

  if (recommendation === 'SHORTLIST') color = C.green;
  if (recommendation === 'REVIEW') color = C.yellow;
  if (recommendation === 'REJECT') color = C.red;
  if (recommendation === 'NOT_CHECKED') color = C.faint;

  return (
    <span
      style={{
        ...statusPillStyle,
        color,
        borderColor: `${color}55`,
        background: `${color}14`,
      }}
    >
      {recommendation.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

function PostJobModal({
  open,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: PostJobForm) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [customSkill, setCustomSkill] = useState('');
  const [form, setForm] = useState<PostJobForm>({
    title: '',
    company: '',
    location: '',
    workMode: 'onsite',
    employmentType: 'full_time',
    description: '',
    requiredSkills: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setForm({
      title: '',
      company: '',
      location: '',
      workMode: 'onsite',
      employmentType: 'full_time',
      description: '',
      requiredSkills: '',
    });
    setCustomSkill('');
  }, [open]);

  const update = (key: keyof PostJobForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedSkills = form.requiredSkills
    .split(',')
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);

  const selectedSkillSet = new Set(selectedSkills);

  const updateSkills = (skills: string[]) => {
    const unique = Array.from(
      new Set(skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean)),
    );

    update('requiredSkills', unique.join(', '));
  };

  const toggleSkill = (skill: string) => {
    const normalized = skill.trim().toLowerCase();
    const next = new Set(selectedSkillSet);

    if (next.has(normalized)) next.delete(normalized);
    else next.add(normalized);

    updateSkills(Array.from(next));
  };

  const addCustomSkill = () => {
    const clean = customSkill.trim().toLowerCase();

    if (!clean) return;

    updateSkills([...selectedSkills, clean]);
    setCustomSkill('');
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div style={modalBackdropStyle}>
      <div style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Post Job Portal</p>
            <h2 style={{ margin: 0, color: C.text, fontSize: 24 }}>
              Create a new job posting
            </h2>
            <p style={{ margin: '6px 0 0', color: C.faint, fontSize: 13 }}>
              This job will be tracked by jobId, applications, ATS checks,
              interviews, feedback, and final result.
            </p>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Job Title *</span>
            <input
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Frontend Developer"
              style={inputStyle}
            />
          </label>

          <div style={twoColStyle}>
            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Company *</span>
              <input
                value={form.company}
                onChange={(event) => update('company', event.target.value)}
                placeholder="Aryvion Technologies"
                style={inputStyle}
              />
            </label>

            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Location</span>
              <input
                value={form.location}
                onChange={(event) => update('location', event.target.value)}
                placeholder="Pune, India"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={twoColStyle}>
            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Work Mode</span>
              <select
                value={form.workMode}
                onChange={(event) =>
                  update('workMode', event.target.value as PostJobForm['workMode'])
                }
                style={inputStyle}
              >
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </label>

            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Employment Type</span>
              <select
                value={form.employmentType}
                onChange={(event) =>
                  update(
                    'employmentType',
                    event.target.value as PostJobForm['employmentType'],
                  )
                }
                style={inputStyle}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
              </select>
            </label>
          </div>

          <div style={fieldWrapStyle}>
            <span style={labelStyle}>Required Skills *</span>

            <div style={selectedSkillsBoxStyle}>
              {selectedSkills.length ? (
                selectedSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() =>
                      updateSkills(selectedSkills.filter((item) => item !== skill))
                    }
                    style={selectedSkillPillStyle}
                  >
                    {skill} <span>×</span>
                  </button>
                ))
              ) : (
                <span style={{ color: C.faint, fontSize: 12 }}>
                  No skills selected yet.
                </span>
              )}
            </div>

            <div style={skillGroupsWrapStyle}>
              {IT_SKILL_GROUPS.map((group) => (
                <section key={group.label} style={skillGroupStyle}>
                  <p style={skillGroupTitleStyle}>{group.label}</p>

                  <div style={skillsGridStyle}>
                    {group.skills.map((skill) => {
                      const active = selectedSkillSet.has(skill);

                      return (
                        <label
                          key={skill}
                          style={{
                            ...skillCheckboxStyle,
                            ...(active ? activeSkillCheckboxStyle : {}),
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleSkill(skill)}
                            style={{ display: 'none' }}
                          />
                          <span>{active ? '✓' : '+'}</span>
                          {skill}
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <input
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomSkill();
                  }
                }}
                placeholder="Add custom IT skill"
                style={inputStyle}
              />

              <button type="button" onClick={addCustomSkill} style={secondaryButtonStyle}>
                Add
              </button>
            </div>

            <input
              value={form.requiredSkills}
              onChange={(event) => update('requiredSkills', event.target.value)}
              placeholder="Final skills: react, next.js, typescript"
              style={inputStyle}
            />
          </div>

          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Description *</span>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Write responsibilities, requirements, interview expectations..."
              rows={7}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
            />
          </label>
        </div>

        <div style={modalFooterStyle}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => onSubmit(form)}
            style={{
              ...primaryButtonStyle,
              opacity: loading ? 0.65 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function RecruiterRecruitmentDashboardPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);

  const [detailsApplication, setDetailsApplication] = useState<ApplicationRow | null>(null);
  const [vacanciesByJobId, setVacanciesByJobId] = useState<Record<string, number>>({});
  const [atsFilter, setAtsFilter] = useState<AtsFilter>('all');

  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [postJobOpen, setPostJobOpen] = useState(false);
  const [postJobLoading, setPostJobLoading] = useState(false);

  const [atsLoadingId, setAtsLoadingId] = useState<string | null>(null);
  const [bulkAtsLoading, setBulkAtsLoading] = useState(false);
  const [autoShortlistLoading, setAutoShortlistLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [shortlistingId, setShortlistingId] = useState<string | null>(null);

  const [scheduleApplicationId, setScheduleApplicationId] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [roundType, setRoundType] = useState('technical');
  const [durationMins, setDurationMins] = useState(45);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const selectedVacancies = useMemo(() => {
    if (!selectedJobId) return getVacancyFromJob(selectedJob);

    return vacanciesByJobId[selectedJobId] ?? getVacancyFromJob(selectedJob);
  }, [selectedJob, selectedJobId, vacanciesByJobId]);

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === scheduleApplicationId) ?? null,
    [applications, scheduleApplicationId],
  );

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const bScore = getAtsScore(b);
      const aScore = getAtsScore(a);

      if (bScore !== aScore) return bScore - aScore;

      const bTime = new Date(b.applied_at ?? b.appliedAt ?? b.created_at ?? b.createdAt ?? '').getTime();
      const aTime = new Date(a.applied_at ?? a.appliedAt ?? a.created_at ?? a.createdAt ?? '').getTime();

      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (atsFilter === 'all') return sortedApplications;

    if (atsFilter === 'unchecked') {
      return sortedApplications.filter((app) => !hasAts(app));
    }

    if (atsFilter === 'shortlist') {
      return sortedApplications.filter((app) => getAtsRecommendation(app) === 'SHORTLIST');
    }

    if (atsFilter === 'review') {
      return sortedApplications.filter((app) => getAtsRecommendation(app) === 'REVIEW');
    }

    if (atsFilter === 'rejected') {
      return sortedApplications.filter((app) => isRejected(app));
    }

    return sortedApplications;
  }, [atsFilter, sortedApplications]);

  const shortlistedApplications = useMemo(() => {
    return sortedApplications.filter((app) => isShortlistedPipeline(app) && !isRejected(app));
  }, [sortedApplications]);

  const scheduleCandidates = useMemo(() => {
    return shortlistedApplications.filter((app) => !isHired(app));
  }, [shortlistedApplications]);

  const recommendedShortlistCount = useMemo(
    () => getRecommendedShortlistCount(selectedVacancies, applications.length),
    [applications.length, selectedVacancies],
  );

  const topRecommendedCandidates = useMemo(() => {
    return sortedApplications
      .filter((app) => hasAts(app) && !isRejected(app) && !isHired(app))
      .slice(0, recommendedShortlistCount);
  }, [recommendedShortlistCount, sortedApplications]);

  const scoreDistribution = useMemo(() => {
    const checked = applications.filter(hasAts);

    return {
      weak: checked.filter((app) => getAtsScore(app) < 40).length,
      review: checked.filter((app) => getAtsScore(app) >= 40 && getAtsScore(app) < 60).length,
      good: checked.filter((app) => getAtsScore(app) >= 60 && getAtsScore(app) < 75).length,
      strong: checked.filter((app) => getAtsScore(app) >= 75).length,
      total: checked.length,
    };
  }, [applications]);

  const stats = useMemo(() => {
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) =>
        ['active', 'published', 'PUBLISHED', 'ACTIVE'].includes(safeString(job.status)),
      ).length,
      totalApplications: applications.length,
      atsChecked: applications.filter(hasAts).length,
      shortlisted: applications.filter(isShortlistedPipeline).length,
      scheduled: applications.filter(isScheduled).length,
      feedback: applications.filter(isFeedbackDone).length,
      hired: applications.filter(isHired).length,
      rejected: applications.filter(isRejected).length,
    };
  }, [applications, jobs]);

  const funnelSteps = useMemo(
    () => [
      { label: 'Applications', value: stats.totalApplications, color: C.sky },
      { label: 'ATS Checked', value: stats.atsChecked, color: C.yellow },
      { label: 'Shortlisted', value: stats.shortlisted, color: C.purple },
      { label: 'Scheduled', value: stats.scheduled, color: C.pink },
      { label: 'Feedback', value: stats.feedback, color: C.orange },
      { label: 'Hired', value: stats.hired, color: C.green },
      { label: 'Rejected', value: stats.rejected, color: C.red },
    ],
    [stats],
  );

  const loadJobs = useCallback(async () => {
    const { data } = await api.get('/jobs/mine');
    const rows = toArray<JobRow>(data, 'jobs').filter(
      (job) => job && typeof job === 'object' && job.id,
    );

    setJobs(rows);
    setSelectedJobId((current) => {
      if (current && rows.some((job) => job.id === current)) return current;
      return rows[0]?.id ?? null;
    });

    try {
      localStorage.setItem(
        'jc_recruiter_stats',
        JSON.stringify({
          activeJobs: rows.filter((job) =>
            ['active', 'published', 'PUBLISHED', 'ACTIVE'].includes(
              safeString(job.status),
            ),
          ).length,
          newApplicants: rows.reduce((sum, job) => sum + getApplicantCount(job), 0),
        }),
      );
    } catch {
      // ignore
    }
  }, []);

  const loadApplicants = useCallback(async (jobId: string | null) => {
    if (!jobId) {
      setApplications([]);
      return;
    }

    setAppsLoading(true);

    try {
      const { data } = await api.get(`/jobs/${jobId}/applicants`);
      const rows = toArray<ApplicationRow>(data, 'applicants').filter(
        (app) => app && typeof app === 'object' && app.id,
      );

      setApplications(rows);

      setScheduleApplicationId((current) => {
        if (current && rows.some((app) => app.id === current)) return current;

        const firstSchedulable = rows.find(canScheduleApplication);
        return firstSchedulable?.id ?? '';
      });
    } catch (error) {
      setApplications([]);
      setMessage(getErrorMessage(error, 'Unable to load applicants.'));
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async (jobId: string | null) => {
    try {
      const { data } = await api.get('/recruiter/interviews/dashboard', {
        params: jobId ? { jobId } : undefined,
      });
      setDashboard(data);
    } catch {
      setDashboard(null);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      await loadJobs();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to load recruitment data.'));
    } finally {
      setLoading(false);
    }
  }, [loadJobs]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hirex_job_vacancies');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setVacanciesByJobId(parsed as Record<string, number>);
        }
      }
    } catch {
      // ignore localStorage parse errors
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadApplicants(selectedJobId);
    void loadDashboard(selectedJobId);
  }, [loadApplicants, loadDashboard, selectedJobId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const postParam = params.get('post');

    if (
      tabParam === 'overview' ||
      tabParam === 'jobs' ||
      tabParam === 'applications' ||
      tabParam === 'shortlisted' ||
      tabParam === 'schedule' ||
      tabParam === 'results'
    ) {
      setTab(tabParam);
    }

    if (postParam === '1' || postParam === 'true') {
      setTab('jobs');
      setPostJobOpen(true);
    }
  }, []);

  function updateVacancies(jobId: string | null, value: number) {
    if (!jobId) return;

    const clean = Math.max(1, Math.round(value || 1));

    setVacanciesByJobId((current) => {
      const next = { ...current, [jobId]: clean };

      try {
        localStorage.setItem('hirex_job_vacancies', JSON.stringify(next));
      } catch {
        // ignore
      }

      return next;
    });
  }

  async function createRecruiterJob(form: PostJobForm) {
    setMessage(null);

    if (!form.title.trim()) return setMessage('Job title is required.');
    if (!form.company.trim()) return setMessage('Company name is required.');
    if (!form.description.trim()) return setMessage('Job description is required.');

    const skills = form.requiredSkills
      .split(',')
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean);

    if (!skills.length) return setMessage('Add at least one required skill.');

    setPostJobLoading(true);

    try {
      await api.post('/jobs', {
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || undefined,
        workMode: form.workMode,
        employmentType: form.employmentType,
        description: form.description.trim(),
        requiredSkills: skills,
        salaryCurrency: 'INR',
        experienceMin: 0,
        industry: 'IT / Software',
      });

      setMessage('Job posted successfully.');
      setPostJobOpen(false);
      setTab('jobs');
      await loadData();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to post job.'));
    } finally {
      setPostJobLoading(false);
    }
  }

  async function runAtsCheck(app: ApplicationRow) {
    setMessage(null);
    setAtsLoadingId(app.id);

    try {
      const { data } = await api.post(`/jobs/applications/${app.id}/ats-check`);
      const score = data?.ats?.atsScore ?? data?.application?.ats_score ?? 'done';

      setMessage(`ATS check completed for ${getCandidateName(app)}. Score: ${score}%`);
      await loadApplicants(selectedJobId);
    } catch (error) {
      setMessage(getErrorMessage(error, 'ATS check failed.'));
    } finally {
      setAtsLoadingId(null);
    }
  }

  async function runAtsForAllCandidates() {
    setMessage(null);

    const target = applications.filter((app) => !isRejected(app) && !isHired(app));

    if (!target.length) {
      setMessage('No active applications found for ATS check.');
      return;
    }

    setBulkAtsLoading(true);

    try {
      await runInBatches(target, 4, async (app, index) => {
        setMessage(`Running ATS ${index + 1}/${target.length}: ${getCandidateName(app)}`);
        await api.post(`/jobs/applications/${app.id}/ats-check`);
      });

      setMessage(`ATS completed for ${target.length} candidate application(s).`);
      await loadApplicants(selectedJobId);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Bulk ATS check failed.'));
    } finally {
      setBulkAtsLoading(false);
    }
  }

  async function shortlistApplication(app: ApplicationRow) {
    setMessage(null);
    setShortlistingId(app.id);

    try {
      await api.patch(`/jobs/applications/${app.id}/status`, {
        status: 'shortlisted',
      });

      setMessage(`${getCandidateName(app)} shortlisted and moved to Shortlisted tracking.`);
      await Promise.all([loadApplicants(selectedJobId), loadDashboard(selectedJobId)]);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to shortlist candidate.'));
    } finally {
      setShortlistingId(null);
    }
  }

  async function autoShortlistTopCandidates() {
    setMessage(null);

    const target = topRecommendedCandidates.filter((app) => !isShortlistedPipeline(app));

    if (!target.length) {
      setMessage('No ATS-ranked candidates available for auto shortlist.');
      return;
    }

    setAutoShortlistLoading(true);

    try {
      await runInBatches(target, 6, async (app) => {
        await api.patch(`/jobs/applications/${app.id}/status`, {
          status: 'shortlisted',
        });
      });

      setMessage(
        `Auto-shortlisted ${target.length} candidate(s) based on vacancies and ATS rank.`,
      );

      await Promise.all([loadApplicants(selectedJobId), loadDashboard(selectedJobId)]);
      setTab('shortlisted');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Auto shortlist failed.'));
    } finally {
      setAutoShortlistLoading(false);
    }
  }

  async function rejectApplication(app: ApplicationRow) {
    setMessage(null);
    setRejectingId(app.id);

    try {
      await api.patch(`/jobs/applications/${app.id}/status`, {
        status: 'rejected',
      });

      setMessage(`${getCandidateName(app)} marked as rejected.`);
      await Promise.all([loadApplicants(selectedJobId), loadDashboard(selectedJobId)]);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to reject candidate.'));
    } finally {
      setRejectingId(null);
    }
  }

  async function scheduleInterview() {
    setMessage(null);
    setScheduleResult(null);

    if (!selectedApplication) return setMessage('Select a shortlisted application first.');

    if (!canScheduleApplication(selectedApplication)) {
      return setMessage('Candidate must be shortlisted before scheduling interview.');
    }

    if (!scheduleAt) return setMessage('Select interview date and time.');

    setScheduling(true);

    try {
      const initResponse = await api.post(
        `/recruiter/interviews/${selectedApplication.id}/init`,
      );

      const interviewId =
        initResponse.data?.id ??
        initResponse.data?.interviewId ??
        initResponse.data?.interview?.id;

      if (!interviewId) {
        throw new Error('Interview was created but interviewId was not returned.');
      }

      const roundResponse = await api.post(
        `/recruiter/interviews/${interviewId}/rounds`,
        {
          roundType,
          scheduledAt: new Date(scheduleAt).toISOString(),
          durationMins,
          mode: 'video',
        },
      );

      const round = roundResponse.data;

      setScheduleResult({
        interviewId,
        roundId: round?.id ?? round?.roundId ?? null,
        joinUrl:
          round?.meetingJoinUrl ??
          round?.meeting_join_url ??
          round?.joinUrl ??
          null,
      });

      setMessage('Interview scheduled. Candidate will see alert and interview entry.');
      await Promise.all([loadApplicants(selectedJobId), loadDashboard(selectedJobId)]);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to schedule interview.'));
    } finally {
      setScheduling(false);
    }
  }

  const messageLooksLikeError = isErrorMessage(message);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>HireX Recruitment Center</h1>
          <p style={subtitleStyle}>
            Track every job, candidate application, ATS decision, shortlist, interview,
            feedback, and final hiring result transparently.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void loadData()} style={secondaryButtonStyle}>
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('jobs');
              setPostJobOpen(true);
            }}
            style={primaryButtonStyle}
          >
            + Post Job
          </button>
        </div>
      </header>

      {message && (
        <div
          style={{
            ...messageStyle,
            borderColor: messageLooksLikeError
              ? 'rgba(248,113,113,0.28)'
              : 'rgba(52,211,153,0.28)',
            background: messageLooksLikeError
              ? 'rgba(248,113,113,0.07)'
              : 'rgba(52,211,153,0.07)',
            color: messageLooksLikeError ? '#FCA5A5' : '#86EFAC',
          }}
        >
          {message}
        </div>
      )}

      <section style={tabBarStyle}>
        {[
          ['overview', 'Overview'],
          ['jobs', 'Jobs'],
          ['applications', 'Applications Center'],
          ['shortlisted', 'Shortlisted'],
          ['schedule', 'Schedule Interview'],
          ['results', 'Results'],
        ].map(([key, label]) => {
          const active = tab === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key as TabKey)}
              style={{
                ...tabButtonStyle,
                ...(active ? activeTabButtonStyle : {}),
              }}
            >
              {label}
            </button>
          );
        })}
      </section>

      {loading ? (
        <div style={panelStyle}>Loading recruitment center...</div>
      ) : (
        <main style={{ display: 'grid', gap: 18 }}>
          {tab === 'overview' && (
            <>
              <section style={gridStyle}>
                <StatCard label="Total Jobs" value={stats.totalJobs} color={C.purple} />
                <StatCard label="Active Jobs" value={stats.activeJobs} color={C.green} />
                <StatCard label="Applications" value={stats.totalApplications} color={C.sky} />
                <StatCard label="ATS Checked" value={stats.atsChecked} color={C.yellow} />
                <StatCard label="Shortlisted" value={stats.shortlisted} color={C.purple} />
                <StatCard label="Scheduled" value={stats.scheduled} color={C.pink} />
                <StatCard label="Feedback" value={stats.feedback} color={C.orange} />
                <StatCard label="Hired" value={stats.hired} color={C.green} />
                <StatCard label="Rejected" value={stats.rejected} color={C.red} />
              </section>

              <section style={analyticsGridStyle}>
                <div style={panelStyle}>
                  <div style={sectionHeadStyle}>
                    <div>
                      <p style={sectionTitleStyle}>Recruitment Funnel</p>
                      <p style={sectionSubStyle}>
                        Transparent hiring flow for selected job.
                      </p>
                    </div>

                    <JobSelector
                      jobs={jobs}
                      selectedJobId={selectedJobId}
                      onChange={setSelectedJobId}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {funnelSteps.map((step) => (
                      <AnalyticsBar
                        key={step.label}
                        label={step.label}
                        value={step.value}
                        total={Math.max(stats.totalApplications, 1)}
                        color={step.color}
                      />
                    ))}
                  </div>
                </div>

                <div style={panelStyle}>
                  <p style={sectionTitleStyle}>ATS Score Distribution</p>
                  <p style={sectionSubStyle}>
                    Helps recruiter understand candidate quality before shortlisting.
                  </p>

                  <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                    <AnalyticsBar
                      label="Strong Fit 75+"
                      value={scoreDistribution.strong}
                      total={Math.max(scoreDistribution.total, 1)}
                      color={C.green}
                    />
                    <AnalyticsBar
                      label="Good Fit 60–74"
                      value={scoreDistribution.good}
                      total={Math.max(scoreDistribution.total, 1)}
                      color={C.sky}
                    />
                    <AnalyticsBar
                      label="Review 40–59"
                      value={scoreDistribution.review}
                      total={Math.max(scoreDistribution.total, 1)}
                      color={C.yellow}
                    />
                    <AnalyticsBar
                      label="Weak 0–39"
                      value={scoreDistribution.weak}
                      total={Math.max(scoreDistribution.total, 1)}
                      color={C.red}
                    />
                  </div>
                </div>
              </section>

              <section style={panelStyle}>
                <div style={sectionHeadStyle}>
                  <div>
                    <p style={sectionTitleStyle}>Job-wise Hiring Target</p>
                    <p style={sectionSubStyle}>
                      Use vacancies to estimate shortlist pool and final hiring target.
                    </p>
                  </div>
                </div>

                <div style={jobSummaryCardStyle}>
                  <div>
                    <strong style={{ color: C.text }}>{selectedJob?.title ?? 'No job selected'}</strong>
                    <p style={smallMutedStyle}>
                      {selectedJob ? `${getCompany(selectedJob)} · ${selectedJob.location ?? 'Location not set'}` : 'Select job first'}
                    </p>
                  </div>

                  <div style={vacancyControlStyle}>
                    <span style={labelStyle}>Vacancies</span>
                    <input
                      type="number"
                      min={1}
                      value={selectedVacancies}
                      onChange={(event) =>
                        updateVacancies(selectedJobId, Number(event.target.value))
                      }
                      style={{ ...inputStyle, maxWidth: 120 }}
                    />
                  </div>

                  <div style={targetBoxStyle}>
                    <span>Recommended shortlist</span>
                    <strong>{recommendedShortlistCount}</strong>
                  </div>

                  <div style={targetBoxStyle}>
                    <span>Final hiring target</span>
                    <strong>{selectedVacancies}</strong>
                  </div>
                </div>
              </section>

              <section style={panelStyle}>
                <p style={sectionTitleStyle}>Candidate Flow Tracking</p>
                <p style={sectionSubStyle}>
                  Each candidate application has separate phase tracking: Applied → ATS Checked → Shortlisted → Scheduled → Interview → Feedback → Hired.
                </p>

                <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
                  {applications.length ? (
                    sortedApplications.slice(0, 8).map((app, index) => (
                      <div key={app.id} style={miniCandidateFlowCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <strong>{getCandidateName(app)}</strong>
                            <p style={smallMutedStyle}>{getCandidateEmail(app)}</p>
                            <p style={tinyMutedStyle}>{getCandidateRankLabel(index)} · ATS {getAtsScore(app)}%</p>
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <AtsRecommendationPill app={app} />
                            <StatusPill status={app.status} />
                            <button
                              type="button"
                              onClick={() => setDetailsApplication(app)}
                              style={compactButtonStyle}
                            >
                              Details
                            </button>
                          </div>
                        </div>

                        <CandidateFlow app={app} />
                      </div>
                    ))
                  ) : (
                    <p style={emptyTextStyle}>
                      Select a job with applicants to see candidate phase tracking.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === 'jobs' && (
            <section style={panelStyle}>
              <div style={sectionHeadStyle}>
                <div>
                  <p style={sectionTitleStyle}>My Jobs</p>
                  <p style={sectionSubStyle}>
                    Select a job to track applications, ATS, interviews, and hiring status.
                  </p>
                </div>

                <button type="button" onClick={() => setPostJobOpen(true)} style={primaryButtonStyle}>
                  + Post Job
                </button>
              </div>

              {jobs.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {jobs.map((job) => {
                    const active = job.id === selectedJobId;

                    return (
                      <button
                        type="button"
                        key={job.id}
                        onClick={() => {
                          setSelectedJobId(job.id);
                          setTab('applications');
                        }}
                        style={{
                          ...jobRowStyle,
                          borderColor: active ? C.borderStrong : C.border,
                          background: active ? 'rgba(124,58,237,0.10)' : C.panel2,
                        }}
                      >
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <strong style={{ color: C.text, fontSize: 15 }}>{job.title}</strong>
                          <p style={smallMutedStyle}>
                            {getCompany(job)} · {job.location ?? 'Location not set'} · {getWorkMode(job)}
                          </p>

                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                            {getRequiredSkills(job).slice(0, 6).map((skill) => (
                              <span key={skill} style={skillPillStyle}>{skill}</span>
                            ))}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <StatusPill status={job.status ?? 'active'} />
                          <p style={smallMutedStyle}>{getApplicantCount(job)} applicants</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={emptyTextStyle}>No recruiter jobs yet.</p>
              )}
            </section>
          )}

          {tab === 'applications' && (
            <section style={panelStyle}>
              <div style={sectionHeadStyle}>
                <div>
                  <p style={sectionTitleStyle}>Applications Center</p>
                  <p style={sectionSubStyle}>
                    Track every applied candidate separately. Run ATS, rank, shortlist, reject, and move selected candidates into scheduling.
                  </p>
                </div>

                <JobSelector
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onChange={setSelectedJobId}
                />
              </div>

              <div style={applicationControlGridStyle}>
                <div style={controlCardStyle}>
                  <span style={labelStyle}>Vacancies</span>
                  <input
                    type="number"
                    min={1}
                    value={selectedVacancies}
                    onChange={(event) =>
                      updateVacancies(selectedJobId, Number(event.target.value))
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={controlCardStyle}>
                  <span style={labelStyle}>Applications</span>
                  <strong>{applications.length}</strong>
                </div>

                <div style={controlCardStyle}>
                  <span style={labelStyle}>ATS Checked</span>
                  <strong>{stats.atsChecked}</strong>
                </div>

                <div style={controlCardStyle}>
                  <span style={labelStyle}>Recommended Shortlist</span>
                  <strong>{recommendedShortlistCount}</strong>
                </div>
              </div>

              <div style={bulkActionBarStyle}>
                <button
                  type="button"
                  onClick={() => void runAtsForAllCandidates()}
                  disabled={bulkAtsLoading || !applications.length}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: bulkAtsLoading || !applications.length ? 0.65 : 1,
                    cursor: bulkAtsLoading || !applications.length ? 'not-allowed' : 'pointer',
                  }}
                >
                  {bulkAtsLoading ? 'Running ATS...' : 'Run ATS for All'}
                </button>

                <button
                  type="button"
                  onClick={() => void autoShortlistTopCandidates()}
                  disabled={autoShortlistLoading || !topRecommendedCandidates.length}
                  style={{
                    ...primaryButtonStyle,
                    opacity: autoShortlistLoading || !topRecommendedCandidates.length ? 0.65 : 1,
                    cursor: autoShortlistLoading || !topRecommendedCandidates.length ? 'not-allowed' : 'pointer',
                  }}
                >
                  {autoShortlistLoading ? 'Shortlisting...' : `Auto Shortlist Top ${recommendedShortlistCount}`}
                </button>

                <button
                  type="button"
                  onClick={() => setTab('shortlisted')}
                  style={secondaryButtonStyle}
                >
                  View Shortlisted ({shortlistedApplications.length})
                </button>
              </div>

              <div style={filterBarStyle}>
                {ATS_FILTERS.map((filter) => {
                  const active = atsFilter === filter.key;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setAtsFilter(filter.key)}
                      style={{
                        ...filterButtonStyle,
                        ...(active ? activeFilterButtonStyle : {}),
                      }}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              {appsLoading ? (
                <p style={emptyTextStyle}>Loading applications...</p>
              ) : filteredApplications.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredApplications.map((app, index) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      rank={sortedApplications.findIndex((candidate) => candidate.id === app.id) + 1 || index + 1}
                      atsLoading={atsLoadingId === app.id}
                      shortlisting={shortlistingId === app.id}
                      rejecting={rejectingId === app.id}
                      onRunAts={() => void runAtsCheck(app)}
                      onShortlist={() => void shortlistApplication(app)}
                      onReject={() => void rejectApplication(app)}
                      onViewDetails={() => setDetailsApplication(app)}
                      onSchedule={() => {
                        setScheduleApplicationId(app.id);
                        setTab('schedule');
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p style={emptyTextStyle}>
                  No applications found for this filter.
                </p>
              )}
            </section>
          )}

          {tab === 'shortlisted' && (
            <section style={panelStyle}>
              <div style={sectionHeadStyle}>
                <div>
                  <p style={sectionTitleStyle}>Shortlisted Candidate Tracking</p>
                  <p style={sectionSubStyle}>
                    Every shortlisted candidate is tracked separately before scheduling, interview, feedback, and final result.
                  </p>
                </div>

                <JobSelector
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onChange={setSelectedJobId}
                />
              </div>

              <div style={shortlistSummaryGridStyle}>
                <StatCard label="Shortlisted" value={shortlistedApplications.length} color={C.purple} />
                <StatCard label="Scheduled" value={shortlistedApplications.filter(isScheduled).length} color={C.pink} />
                <StatCard label="Feedback Done" value={shortlistedApplications.filter(isFeedbackDone).length} color={C.orange} />
                <StatCard label="Hired" value={shortlistedApplications.filter(isHired).length} color={C.green} />
              </div>

              {shortlistedApplications.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {shortlistedApplications.map((app, index) => (
                    <ShortlistedCandidateCard
                      key={app.id}
                      app={app}
                      rank={index + 1}
                      onViewDetails={() => setDetailsApplication(app)}
                      onSchedule={() => {
                        setScheduleApplicationId(app.id);
                        setTab('schedule');
                      }}
                      onReject={() => void rejectApplication(app)}
                      rejecting={rejectingId === app.id}
                    />
                  ))}
                </div>
              ) : (
                <div style={emptyPanelStyle}>
                  <strong>No shortlisted candidates yet.</strong>
                  <p>
                    Run ATS in Applications Center, then shortlist top candidates based on vacancy target.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('applications')}
                    style={primaryButtonStyle}
                  >
                    Go to Applications Center
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === 'schedule' && (
            <section style={panelStyle}>
              <p style={sectionTitleStyle}>Schedule Interview</p>
              <p style={sectionSubStyle}>
                Schedule only shortlisted/reviewed candidates. Candidate will receive alert and interview entry.
              </p>

              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                <label style={fieldWrapStyle}>
                  <span style={labelStyle}>Shortlisted Application</span>
                  <select
                    value={scheduleApplicationId}
                    onChange={(event) => setScheduleApplicationId(event.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select shortlisted candidate</option>
                    {scheduleCandidates.map((app) => (
                      <option key={app.id} value={app.id}>
                        {getCandidateName(app)} · ATS {getAtsScore(app)}% · {normalizeStatus(app.status)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedApplication && (
                  <div style={miniInfoStyle}>
                    <strong>{getCandidateName(selectedApplication)}</strong>
                    <span>{getCandidateEmail(selectedApplication)}</span>
                    <span>ATS: {getAtsScore(selectedApplication)}% · {getAtsRecommendation(selectedApplication)}</span>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setDetailsApplication(selectedApplication)}
                        style={secondaryButtonStyle}
                      >
                        View Details / Resume
                      </button>
                    </div>

                    <CandidateFlow app={selectedApplication} />
                  </div>
                )}

                {!selectedApplication && (
                  <p style={emptyTextStyle}>
                    No candidate selected. Go to Shortlisted tab and choose a candidate to schedule.
                  </p>
                )}

                <div style={twoColStyle}>
                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Round Type</span>
                    <select
                      value={roundType}
                      onChange={(event) => setRoundType(event.target.value)}
                      style={inputStyle}
                    >
                      <option value="technical">Technical</option>
                      <option value="hr">HR</option>
                      <option value="managerial">Managerial</option>
                      <option value="assignment">Assignment</option>
                    </select>
                  </label>

                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Duration</span>
                    <select
                      value={durationMins}
                      onChange={(event) => setDurationMins(Number(event.target.value))}
                      style={inputStyle}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </label>
                </div>

                <label style={fieldWrapStyle}>
                  <span style={labelStyle}>Date & Time</span>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(event) => setScheduleAt(event.target.value)}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void scheduleInterview()}
                  disabled={scheduling || !selectedApplication}
                  style={{
                    ...primaryButtonStyle,
                    opacity: scheduling || !selectedApplication ? 0.65 : 1,
                    cursor: scheduling || !selectedApplication ? 'not-allowed' : 'pointer',
                  }}
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Interview + Notify Candidate'}
                </button>

                {scheduleResult && (
                  <div style={successBoxStyle}>
                    <strong style={{ color: C.green }}>Interview scheduled.</strong>
                    <div>Interview ID: {scheduleResult.interviewId}</div>
                    {scheduleResult.roundId && <div>Round ID: {scheduleResult.roundId}</div>}
                    {scheduleResult.joinUrl && (
                      <a
                        href={scheduleResult.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: C.sky, fontWeight: 900 }}
                      >
                        Open interview room →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === 'results' && (
            <section style={panelStyle}>
              <p style={sectionTitleStyle}>Interview Results & Candidate Pipeline</p>
              <p style={sectionSubStyle}>
                Final hiring results are tracked candidate-by-candidate, not as one shared job state.
              </p>

              <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                {sortedApplications.length ? (
                  sortedApplications.map((app, index) => (
                    <div key={app.id} style={resultRowStyle}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: C.text }}>
                          #{index + 1} · {getCandidateName(app)}
                        </strong>
                        <p style={smallMutedStyle}>
                          ATS {getAtsScore(app)}% · {getAtsRecommendation(app)}
                        </p>
                        <CandidateFlow app={app} />
                      </div>

                      <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                        <AtsRecommendationPill app={app} />
                        <StatusPill status={app.status} />
                        <button
                          type="button"
                          onClick={() => setDetailsApplication(app)}
                          style={secondaryButtonStyle}
                        >
                          View Details / Resume
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={emptyTextStyle}>No results yet.</p>
                )}
              </div>

              {dashboard && <pre style={debugStyle}>{JSON.stringify(dashboard, null, 2)}</pre>}
            </section>
          )}
        </main>
      )}

      <CandidateDetailsDrawer
        open={Boolean(detailsApplication)}
        app={detailsApplication}
        job={selectedJob}
        onClose={() => setDetailsApplication(null)}
      />

      <PostJobModal
        open={postJobOpen}
        loading={postJobLoading}
        onClose={() => setPostJobOpen(false)}
        onSubmit={(form) => void createRecruiterJob(form)}
      />
    </div>
  );
}

function JobSelector({
  jobs,
  selectedJobId,
  onChange,
}: {
  jobs: JobRow[];
  selectedJobId: string | null;
  onChange: (jobId: string | null) => void;
}) {
  return (
    <select
      value={selectedJobId ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      style={{ ...inputStyle, minWidth: 260 }}
    >
      {jobs.length ? (
        jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title}
          </option>
        ))
      ) : (
        <option value="">No jobs</option>
      )}
    </select>
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

function AnalyticsBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const width = total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100));

  return (
    <div style={analyticsBarWrapStyle}>
      <div style={analyticsBarHeaderStyle}>
        <span>{label}</span>
        <strong style={{ color }}>{value}</strong>
      </div>

      <div style={analyticsTrackStyle}>
        <div
          style={{
            ...analyticsFillStyle,
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            boxShadow: value ? `0 0 20px ${color}44` : 'none',
          }}
        />
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  rank,
  atsLoading,
  shortlisting,
  rejecting,
  onRunAts,
  onShortlist,
  onReject,
  onSchedule,
  onViewDetails,
}: {
  app: ApplicationRow;
  rank: number;
  atsLoading: boolean;
  shortlisting: boolean;
  rejecting: boolean;
  onRunAts: () => void;
  onShortlist: () => void;
  onReject: () => void;
  onSchedule: () => void;
  onViewDetails: () => void;
}) {
  const atsScore = getAtsScore(app);
  const atsRecommendation = getAtsRecommendation(app);
  const checked = hasAts(app);
  const rejected = isRejected(app);
  const hired = isHired(app);
  const shortlisted = isShortlistedPipeline(app);
  const canShortlist = checked && !rejected && !hired;
  const canSchedule = canScheduleApplication(app);

  return (
    <article style={applicationCardStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={applicationHeaderStyle}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={rankPillStyle}>#{rank}</span>
              <strong style={{ color: C.text }}>{getCandidateName(app)}</strong>
            </div>

            <p style={smallMutedStyle}>{getCandidateEmail(app)}</p>
            <p style={tinyMutedStyle}>
              Applied: {formatDate(app.applied_at ?? app.appliedAt ?? app.created_at ?? app.createdAt)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <AtsRecommendationPill app={app} />
            <StatusPill status={app.status} />
          </div>
        </div>

        <CandidateFlow app={app} />

        <div style={atsBoxStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={atsTitleStyle}>ATS Resume Check</p>
              {checked ? (
                <p style={smallMutedStyle}>
                  Score: <strong style={{ color: atsScore >= 75 ? C.green : atsScore >= 55 ? C.yellow : C.red }}>{atsScore}%</strong> · Recommendation:{' '}
                  <strong style={{ color: atsRecommendation === 'REJECT' ? C.red : atsRecommendation === 'SHORTLIST' ? C.green : C.yellow }}>
                    {atsRecommendation}
                  </strong>
                </p>
              ) : (
                <p style={smallMutedStyle}>
                  Not checked yet. Run Python ATS before shortlisting.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onRunAts}
              disabled={atsLoading || rejected || hired}
              style={{
                ...secondaryButtonStyle,
                opacity: atsLoading || rejected || hired ? 0.65 : 1,
                cursor: atsLoading || rejected || hired ? 'not-allowed' : 'pointer',
              }}
            >
              {atsLoading ? 'Checking...' : checked ? 'Re-check ATS' : 'Run ATS Check'}
            </button>
          </div>

          {checked && (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <div style={skillRowStyle}>
                {(app.ats_matched_skills ?? []).slice(0, 8).map((skill) => (
                  <span key={skill} style={matchedSkillStyle}>{skill}</span>
                ))}
                {!(app.ats_matched_skills ?? []).length && (
                  <span style={tinyMutedStyle}>No matched skills returned.</span>
                )}
              </div>

              <div style={skillRowStyle}>
                {(app.ats_missing_skills ?? []).slice(0, 8).map((skill) => (
                  <span key={skill} style={missingSkillStyle}>{skill}</span>
                ))}
              </div>

              {app.ats_reason && <p style={atsReasonStyle}>{app.ats_reason}</p>}
            </div>
          )}
        </div>
      </div>

      <div style={applicationActionStyle}>
        <button type="button" onClick={onViewDetails} style={secondaryButtonStyle}>
          View Details / Resume
        </button>

        <button
          type="button"
          onClick={onShortlist}
          disabled={!canShortlist || shortlisting || shortlisted}
          style={{
            ...secondaryButtonStyle,
            opacity: !canShortlist || shortlisting || shortlisted ? 0.6 : 1,
            cursor: !canShortlist || shortlisting || shortlisted ? 'not-allowed' : 'pointer',
          }}
        >
          {shortlisting ? 'Shortlisting...' : shortlisted ? 'Shortlisted' : 'Shortlist'}
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={rejecting || rejected || hired}
          style={{
            ...dangerButtonStyle,
            opacity: rejecting || rejected || hired ? 0.6 : 1,
            cursor: rejecting || rejected || hired ? 'not-allowed' : 'pointer',
          }}
        >
          {rejecting ? 'Rejecting...' : rejected ? 'Rejected' : 'Reject'}
        </button>

        <button
          type="button"
          onClick={onSchedule}
          disabled={!canSchedule}
          style={{
            ...primaryButtonStyle,
            opacity: canSchedule ? 1 : 0.55,
            cursor: canSchedule ? 'pointer' : 'not-allowed',
          }}
        >
          Schedule
        </button>
      </div>
    </article>
  );
}

function ShortlistedCandidateCard({
  app,
  rank,
  onSchedule,
  onReject,
  onViewDetails,
  rejecting,
}: {
  app: ApplicationRow;
  rank: number;
  onSchedule: () => void;
  onReject: () => void;
  onViewDetails: () => void;
  rejecting: boolean;
}) {
  const atsScore = getAtsScore(app);
  const status = normalizeStatus(app.status);
  const needsSchedule = !isScheduled(app) && !isHired(app);

  return (
    <article style={shortlistedCardStyle}>
      <div style={shortlistedHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>Shortlisted Candidate #{rank}</p>
          <h3 style={candidateNameStyle}>{getCandidateName(app)}</h3>
          <p style={smallMutedStyle}>{getCandidateEmail(app)}</p>
        </div>

        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
          <strong style={{ color: atsScore >= 75 ? C.green : C.yellow, fontSize: 28 }}>
            {atsScore}%
          </strong>
          <AtsRecommendationPill app={app} />
        </div>
      </div>

      <CandidateFlow app={app} />

      <div style={shortlistedInfoGridStyle}>
        <div style={miniMetricStyle}>
          <span>Status</span>
          <strong>{status}</strong>
        </div>

        <div style={miniMetricStyle}>
          <span>Matched Skills</span>
          <strong>{app.ats_matched_skills?.length ?? 0}</strong>
        </div>

        <div style={miniMetricStyle}>
          <span>Missing Skills</span>
          <strong>{app.ats_missing_skills?.length ?? 0}</strong>
        </div>

        <div style={miniMetricStyle}>
          <span>Next Step</span>
          <strong>{needsSchedule ? 'Schedule' : isHired(app) ? 'Completed' : 'Track'}</strong>
        </div>
      </div>

      <div style={skillRowStyle}>
        {(app.ats_matched_skills ?? []).slice(0, 10).map((skill) => (
          <span key={skill} style={matchedSkillStyle}>{skill}</span>
        ))}
      </div>

      {app.ats_reason && <p style={atsReasonStyle}>{app.ats_reason}</p>}

      <div style={applicationActionStyle}>
        <button type="button" onClick={onViewDetails} style={secondaryButtonStyle}>
          View Details / Resume
        </button>

        <button
          type="button"
          onClick={onSchedule}
          disabled={!canScheduleApplication(app)}
          style={{
            ...primaryButtonStyle,
            opacity: canScheduleApplication(app) ? 1 : 0.55,
            cursor: canScheduleApplication(app) ? 'pointer' : 'not-allowed',
          }}
        >
          {isScheduled(app) ? 'Reschedule / Add Round' : 'Schedule Interview'}
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={rejecting || isHired(app)}
          style={{
            ...dangerButtonStyle,
            opacity: rejecting || isHired(app) ? 0.6 : 1,
            cursor: rejecting || isHired(app) ? 'not-allowed' : 'pointer',
          }}
        >
          {rejecting ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </article>
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
  alignItems: 'center',
  justifyContent: 'space-between',
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

const tabBarStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 18,
  padding: 8,
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  background: C.panel,
};

const tabButtonStyle: CSSProperties = {
  border: '1px solid transparent',
  background: 'transparent',
  color: C.faint,
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 900,
  fontFamily: "'Sora', sans-serif",
};

const activeTabButtonStyle: CSSProperties = {
  background: 'rgba(124,58,237,0.18)',
  borderColor: C.borderStrong,
  color: C.purple,
};

const panelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 20,
  padding: '1.25rem',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 14,
};

const analyticsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 18,
};

const statCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 18,
  padding: '1.1rem',
  display: 'grid',
  gap: 6,
};

const sectionHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 950,
  color: C.text,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const sectionSubStyle: CSSProperties = {
  margin: '6px 0 0',
  color: C.faint,
  fontSize: 12,
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: C.faint,
  fontSize: 13,
  lineHeight: 1.7,
};

const smallMutedStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.faint,
  fontSize: 12,
};

const tinyMutedStyle: CSSProperties = {
  margin: 0,
  color: C.faint,
  fontSize: 11,
};

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 14,
  padding: '11px 16px',
  color: '#020617',
  fontWeight: 950,
  cursor: 'pointer',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
  boxShadow: '0 16px 38px rgba(56,189,248,0.18)',
  fontFamily: "'Sora', sans-serif",
  textDecoration: 'none',
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '10px 14px',
  color: C.text,
  fontWeight: 850,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
  fontFamily: "'Sora', sans-serif",
  textDecoration: 'none',
};

const compactButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  padding: '6px 10px',
  fontSize: 11,
  borderRadius: 999,
};

const dangerButtonStyle: CSSProperties = {
  border: '1px solid rgba(248,113,113,0.28)',
  borderRadius: 14,
  padding: '10px 14px',
  color: '#FCA5A5',
  fontWeight: 850,
  cursor: 'pointer',
  background: 'rgba(248,113,113,0.08)',
  fontFamily: "'Sora', sans-serif",
  textDecoration: 'none',
};

const closeButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  width: 58,
  height: 58,
  flexShrink: 0,
  color: C.text,
  fontSize: 24,
  fontWeight: 900,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
  fontFamily: "'Sora', sans-serif",
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: `1px solid ${C.border}`,
  background: 'rgba(15,23,42,0.86)',
  color: C.text,
  borderRadius: 12,
  padding: '12px 13px',
  outline: 'none',
  fontSize: 14,
  fontFamily: "'Sora', sans-serif",
};

const labelStyle: CSSProperties = {
  color: C.faint,
  fontSize: 12,
  fontWeight: 900,
};

const fieldWrapStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

const selectedSkillsBoxStyle: CSSProperties = {
  minHeight: 52,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  padding: 12,
  border: `1px solid ${C.border}`,
  background: 'rgba(15,23,42,0.55)',
  borderRadius: 14,
};

const selectedSkillPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: '1px solid rgba(52,211,153,0.28)',
  background: 'rgba(52,211,153,0.11)',
  color: '#6EE7B7',
  borderRadius: 999,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  textTransform: 'capitalize',
  fontFamily: "'Sora', sans-serif",
};

const skillGroupsWrapStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  maxHeight: 360,
  overflowY: 'auto',
  padding: 12,
  border: `1px solid ${C.border}`,
  background: 'rgba(15,23,42,0.42)',
  borderRadius: 16,
};

const skillGroupStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const skillGroupTitleStyle: CSSProperties = {
  margin: 0,
  color: C.purple,
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const skillsGridStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const skillCheckboxStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.035)',
  color: C.muted,
  borderRadius: 999,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 850,
  cursor: 'pointer',
  userSelect: 'none',
  textTransform: 'capitalize',
};

const activeSkillCheckboxStyle: CSSProperties = {
  borderColor: 'rgba(52,211,153,0.35)',
  background: 'rgba(52,211,153,0.10)',
  color: '#6EE7B7',
};

const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(2,6,23,0.86)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '28px 18px',
  zIndex: 9999,
  overflowY: 'auto',
};

const modalCardStyle: CSSProperties = {
  width: 'min(920px, calc(100vw - 36px))',
  maxHeight: 'calc(100vh - 56px)',
  overflowY: 'auto',
  border: `1px solid ${C.borderStrong}`,
  background: '#0B1020',
  borderRadius: 24,
  padding: '1.35rem',
  boxShadow: '0 30px 100px rgba(0,0,0,0.65)',
};

const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
};

const modalFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 20,
};

const eyebrowStyle: CSSProperties = {
  margin: '0 0 6px',
  color: C.purple,
  fontSize: 12,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const messageStyle: CSSProperties = {
  border: '1px solid',
  borderRadius: 16,
  padding: '12px 14px',
  marginBottom: 16,
  fontSize: 13,
  fontWeight: 800,
};

const jobRowStyle: CSSProperties = {
  width: '100%',
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: '1rem',
  display: 'flex',
  gap: 16,
  justifyContent: 'space-between',
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const skillPillStyle: CSSProperties = {
  border: '1px solid rgba(52,211,153,0.20)',
  background: 'rgba(52,211,153,0.08)',
  color: '#6EE7B7',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 850,
};

const statusPillStyle: CSSProperties = {
  border: `1px solid ${C.borderStrong}`,
  background: 'rgba(124,58,237,0.12)',
  color: C.purple,
  borderRadius: 999,
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'capitalize',
};

const applicationCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 18,
  padding: '1rem',
  display: 'grid',
  gap: 14,
};

const applicationHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 14,
};

const applicationActionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const atsBoxStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(2,6,23,0.30)',
  borderRadius: 14,
  padding: '0.9rem',
  marginTop: 12,
};

const atsTitleStyle: CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 12,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const atsReasonStyle: CSSProperties = {
  margin: 0,
  color: C.muted,
  fontSize: 12,
  lineHeight: 1.65,
};

const skillRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const matchedSkillStyle: CSSProperties = {
  border: '1px solid rgba(52,211,153,0.25)',
  background: 'rgba(52,211,153,0.08)',
  color: '#6EE7B7',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 850,
};

const missingSkillStyle: CSSProperties = {
  border: '1px solid rgba(248,113,113,0.25)',
  background: 'rgba(248,113,113,0.08)',
  color: '#FCA5A5',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 850,
};

const candidateFlowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${FLOW_STAGES.length}, minmax(0, 1fr))`,
  gap: 4,
  marginTop: 12,
  overflowX: 'auto',
};

const flowItemStyle: CSSProperties = {
  position: 'relative',
  display: 'grid',
  justifyItems: 'center',
  gap: 6,
  minWidth: 80,
  fontSize: 10,
  fontWeight: 800,
  textAlign: 'center',
};

const flowDotStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: '#020617',
  fontSize: 11,
  fontWeight: 950,
  zIndex: 2,
};

const flowConnectorStyle: CSSProperties = {
  position: 'absolute',
  top: 11,
  left: '50%',
  width: '100%',
  height: 3,
  zIndex: 1,
};

const miniCandidateFlowCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 16,
  padding: '1rem',
};

const miniInfoStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 14,
  padding: '12px 14px',
  display: 'grid',
  gap: 6,
  color: C.faint,
  fontSize: 13,
};

const successBoxStyle: CSSProperties = {
  marginTop: 4,
  padding: 14,
  borderRadius: 16,
  border: `1px solid rgba(52,211,153,0.28)`,
  background: 'rgba(52,211,153,0.08)',
  color: C.muted,
  fontSize: 13,
  lineHeight: 1.8,
  display: 'grid',
  gap: 3,
};

const resultRowStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 16,
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
};

const debugStyle: CSSProperties = {
  marginTop: 18,
  maxHeight: 260,
  overflowY: 'auto',
  border: `1px solid ${C.border}`,
  background: 'rgba(0,0,0,0.22)',
  color: C.faint,
  borderRadius: 14,
  padding: 12,
  fontSize: 11,
};

const analyticsBarWrapStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const analyticsBarHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  color: C.muted,
  fontSize: 12,
  fontWeight: 850,
};

const analyticsTrackStyle: CSSProperties = {
  height: 10,
  borderRadius: 999,
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.07)',
};

const analyticsFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 999,
};

const jobSummaryCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 18,
  padding: '1rem',
  display: 'grid',
  gridTemplateColumns: '1.6fr minmax(140px, 180px) repeat(2, minmax(150px, 1fr))',
  gap: 14,
  alignItems: 'center',
};

const vacancyControlStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const targetBoxStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.035)',
  display: 'grid',
  gap: 4,
};

const applicationControlGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginBottom: 14,
};

const controlCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 16,
  padding: '1rem',
  display: 'grid',
  gap: 7,
};

const bulkActionBarStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(15,23,42,0.58)',
  borderRadius: 16,
  padding: 12,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: 14,
};

const filterBarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 14,
};

const filterButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.035)',
  color: C.muted,
  borderRadius: 999,
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 850,
  fontFamily: "'Sora', sans-serif",
};

const activeFilterButtonStyle: CSSProperties = {
  borderColor: C.borderStrong,
  background: 'rgba(167,139,250,0.14)',
  color: C.purple,
};

const rankPillStyle: CSSProperties = {
  border: '1px solid rgba(56,189,248,0.28)',
  background: 'rgba(56,189,248,0.10)',
  color: C.sky,
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 950,
};

const shortlistSummaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 12,
  marginBottom: 18,
};

const emptyPanelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 18,
  padding: '2rem',
  display: 'grid',
  gap: 12,
  justifyItems: 'start',
  color: C.muted,
};

const shortlistedCardStyle: CSSProperties = {
  border: `1px solid rgba(167,139,250,0.22)`,
  background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(15,23,42,0.85))',
  borderRadius: 20,
  padding: '1.1rem',
  display: 'grid',
  gap: 14,
};

const shortlistedHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 14,
};

const candidateNameStyle: CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 19,
  fontWeight: 950,
};

const shortlistedInfoGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
};

const miniMetricStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '10px 12px',
  background: 'rgba(2,6,23,0.30)',
  display: 'grid',
  gap: 5,
};