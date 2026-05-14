/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// frontend/app/(protected)/recruiter/dashboard/page.tsx

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import api from '@/lib/axios';

type TabKey = 'overview' | 'jobs' | 'applications' | 'schedule' | 'results';

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
  requiredSkills?: string[];
  required_skills?: string[];
  status?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  _count?: { applications?: number };
};

type ApplicationRow = {
  id: string;
  job_id?: string;
  jobId?: string;
  candidate_user_id?: string;
  candidateUserId?: string;
  status: string;
  applied_at?: string;
  appliedAt?: string;
  created_at?: string;
  createdAt?: string;
  candidate?: {
    id?: string;
    name?: string;
    fullName?: string;
    full_name?: string;
    email?: string;
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
  companyName: string;
  location: string;
  workMode: string;
  employmentType: string;
  description: string;
  requiredSkills: string;
};

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
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
};

function toArray<T>(raw: unknown, key?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];

  const obj = raw as Record<string, unknown>;

  for (const candidate of ['data', 'items', 'results', key].filter(Boolean) as string[]) {
    if (Array.isArray(obj[candidate])) return obj[candidate] as T[];
  }

  return [];
}

function getErrorMessage(error: unknown, fallback: string) {
  const anyError = error as any;

  return (
    anyError?.response?.data?.detail ??
    anyError?.response?.data?.message ??
    anyError?.response?.data?.error ??
    anyError?.message ??
    fallback
  );
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
  return job?.companyName ?? job?.company_name ?? job?.company ?? 'Your company';
}

function getWorkMode(job?: JobRow | null) {
  return job?.workMode ?? job?.work_mode ?? 'onsite';
}

function getEmploymentType(job?: JobRow | null) {
  return job?.employmentType ?? job?.employment_type ?? 'full_time';
}

function getRequiredSkills(job?: JobRow | null) {
  return job?.requiredSkills ?? job?.required_skills ?? [];
}

function getCandidateName(app: ApplicationRow) {
  return (
    app.candidate?.fullName ??
    app.candidate?.full_name ??
    app.candidate?.name ??
    app.candidate?.email ??
    'Candidate'
  );
}

function normalizeStatus(status?: string | null) {
  return String(status ?? 'applied')
    .replaceAll('_', ' ')
    .toLowerCase();
}

function statusColor(status?: string | null) {
  const s = normalizeStatus(status);

  if (s.includes('shortlist')) return C.yellow;
  if (s.includes('interview')) return C.purple;
  if (s.includes('offer') || s.includes('hire')) return C.green;
  if (s.includes('reject') || s.includes('fail')) return C.red;

  return C.sky;
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
  const [form, setForm] = useState<PostJobForm>({
    title: '',
    companyName: '',
    location: '',
    workMode: 'onsite',
    employmentType: 'full_time',
    description: '',
    requiredSkills: '',
  });

  useEffect(() => {
    if (!open) return;

    setForm({
      title: '',
      companyName: '',
      location: '',
      workMode: 'onsite',
      employmentType: 'full_time',
      description: '',
      requiredSkills: '',
    });
  }, [open]);

  if (!open) return null;

  const update = (key: keyof PostJobForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={modalBackdropStyle}>
      <div style={modalCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={eyebrowStyle}>Post Job Portal</p>
            <h2 style={{ margin: 0, color: C.text, fontSize: 24 }}>
              Create a new job posting
            </h2>
            <p style={{ margin: '6px 0 0', color: C.faint, fontSize: 13 }}>
              This job will be tracked by jobId, applications, shortlist,
              interviews, and final result.
            </p>
          </div>

          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Job Title *</span>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Frontend Developer"
              style={inputStyle}
            />
          </label>

          <div style={twoColStyle}>
            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Company</span>
              <input
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                placeholder="Aryvion Technologies"
                style={inputStyle}
              />
            </label>

            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Location</span>
              <input
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
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
                onChange={(e) => update('workMode', e.target.value)}
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
                onChange={(e) => update('employmentType', e.target.value)}
                style={inputStyle}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </label>
          </div>

          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Required Skills *</span>
            <input
              value={form.requiredSkills}
              onChange={(e) => update('requiredSkills', e.target.value)}
              placeholder="react, next.js, typescript, node.js"
              style={inputStyle}
            />
          </label>

          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Description *</span>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Write responsibilities, requirements, interview expectations..."
              rows={7}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={loading} style={secondaryButtonStyle}>
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
    </div>
  );
}

export default function RecruiterRecruitmentDashboardPage() {
  const [tab, setTab] = useState<TabKey>('overview');

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [postJobOpen, setPostJobOpen] = useState(false);
  const [postJobLoading, setPostJobLoading] = useState(false);

  const [scheduleApplicationId, setScheduleApplicationId] = useState<string>('');
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [roundType, setRoundType] = useState<string>('technical');
  const [durationMins, setDurationMins] = useState<number>(45);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === scheduleApplicationId) ?? null,
    [applications, scheduleApplicationId],
  );

  const stats = useMemo(() => {
    const totalApplications = applications.length;
    const shortlisted = applications.filter((app) =>
      normalizeStatus(app.status).includes('shortlist'),
    ).length;
    const interviews = applications.filter((app) =>
      normalizeStatus(app.status).includes('interview'),
    ).length;
    const rejected = applications.filter((app) =>
      normalizeStatus(app.status).includes('reject'),
    ).length;

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) =>
        ['active', 'published', 'PUBLISHED', 'ACTIVE'].includes(String(job.status)),
      ).length,
      totalApplications,
      shortlisted,
      interviews,
      rejected,
    };
  }, [applications, jobs]);

  const loadJobs = useCallback(async () => {
    const { data } = await api.get('/jobs/mine');
    const rows = toArray<JobRow>(data, 'jobs');

    setJobs(rows);

    const activeJobs = rows.filter((job) =>
      ['active', 'published', 'PUBLISHED', 'ACTIVE'].includes(String(job.status)),
    ).length;

    try {
      localStorage.setItem(
        'jc_recruiter_stats',
        JSON.stringify({
          activeJobs,
          newApplicants: rows.reduce(
            (sum, job) => sum + Number(job._count?.applications ?? 0),
            0,
          ),
        }),
      );
    } catch {
      // ignore localStorage issues
    }

    setSelectedJobId((current) => {
      if (current && rows.some((job) => job.id === current)) return current;
      return rows[0]?.id ?? null;
    });
  }, []);

  const loadApplicants = useCallback(async (jobId: string | null) => {
    if (!jobId) {
      setApplications([]);
      return;
    }

    setAppsLoading(true);

    try {
      const { data } = await api.get(`/jobs/${jobId}/applicants`);
      const rows = toArray<ApplicationRow>(data, 'applicants');

      setApplications(rows);

      setScheduleApplicationId((current) => {
        if (current && rows.some((app) => app.id === current)) return current;
        return rows.find((app) => normalizeStatus(app.status).includes('shortlist'))?.id
          ?? rows[0]?.id
          ?? '';
      });
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

  async function createRecruiterJob(form: PostJobForm) {
    setMessage(null);

    if (!form.title.trim()) {
      setMessage('Job title is required.');
      return;
    }

    if (!form.description.trim()) {
      setMessage('Job description is required.');
      return;
    }

    const skills = form.requiredSkills
      .split(',')
      .map((skill) => skill.trim().toLowerCase())
      .filter(Boolean);

    if (!skills.length) {
      setMessage('Add at least one required skill.');
      return;
    }

    setPostJobLoading(true);

    try {
      const payload = {
        title: form.title.trim(),
        companyName: form.companyName.trim(),
        company_name: form.companyName.trim(),
        location: form.location.trim(),
        workMode: form.workMode,
        work_mode: form.workMode,
        employmentType: form.employmentType,
        employment_type: form.employmentType,
        description: form.description.trim(),
        requiredSkills: skills,
        required_skills: skills,
        status: 'active',
        source: 'internal',
      };

      await api.post('/jobs', payload);

      setMessage('Job posted successfully. Applications will now be tracked under this job.');
      setPostJobOpen(false);
      setTab('jobs');

      await loadData();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to post job.'));
    } finally {
      setPostJobLoading(false);
    }
  }

  async function shortlistApplication(app: ApplicationRow) {
    setMessage(null);

    try {
      await api.patch(`/jobs/applications/${app.id}/status`, {
        status: 'shortlisted',
      });

      setMessage(`${getCandidateName(app)} shortlisted for interview workflow.`);

      await Promise.all([
        loadApplicants(selectedJobId),
        loadDashboard(selectedJobId),
      ]);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to shortlist candidate.'));
    }
  }

  async function scheduleInterview() {
    setMessage(null);
    setScheduleResult(null);

    if (!selectedApplication) {
      setMessage('Select an application first.');
      return;
    }

    if (!scheduleAt) {
      setMessage('Select interview date and time.');
      return;
    }

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

      const scheduledAtIso = new Date(scheduleAt).toISOString();

      const roundResponse = await api.post(
        `/recruiter/interviews/${interviewId}/rounds`,
        {
          roundType,
          scheduledAt: scheduledAtIso,
          durationMins,
          mode: 'video',
        },
      );

      const round = roundResponse.data;

      const result: ScheduleResult = {
        interviewId,
        roundId: round?.id ?? round?.roundId ?? null,
        joinUrl:
          round?.meetingJoinUrl ??
          round?.meeting_join_url ??
          round?.joinUrl ??
          null,
      };

      setScheduleResult(result);
      setMessage(
        'Interview scheduled. Candidate will see this in Alerts and Interviews section.',
      );

      await Promise.all([
        loadApplicants(selectedJobId),
        loadDashboard(selectedJobId),
      ]);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to schedule interview.'));
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Recruitment Center</h1>
          <p style={subtitleStyle}>
            Track every job, application, shortlist, interview schedule and result.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void loadData()}
            style={secondaryButtonStyle}
          >
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
            borderColor: message.toLowerCase().includes('failed') ||
              message.toLowerCase().includes('unable')
              ? 'rgba(248,113,113,0.28)'
              : 'rgba(52,211,153,0.28)',
            background: message.toLowerCase().includes('failed') ||
              message.toLowerCase().includes('unable')
              ? 'rgba(248,113,113,0.07)'
              : 'rgba(52,211,153,0.07)',
            color: message.toLowerCase().includes('failed') ||
              message.toLowerCase().includes('unable')
              ? '#FCA5A5'
              : '#86EFAC',
          }}
        >
          {message}
        </div>
      )}

      <section style={tabBarStyle}>
        {[
          ['overview', 'Overview'],
          ['jobs', 'Jobs'],
          ['applications', 'Applications'],
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
                <StatCard label="Shortlisted" value={stats.shortlisted} color={C.yellow} />
                <StatCard label="In Interview" value={stats.interviews} color={C.purple} />
                <StatCard label="Rejected" value={stats.rejected} color={C.red} />
              </section>

              <section style={panelStyle}>
                <p style={sectionTitleStyle}>Selected job tracking</p>
                {selectedJob ? (
                  <JobSummary job={selectedJob} />
                ) : (
                  <p style={emptyTextStyle}>
                    No jobs yet. Click Post Job to create your first recruiter job.
                  </p>
                )}
              </section>
            </>
          )}

          {tab === 'jobs' && (
            <section style={panelStyle}>
              <div style={sectionHeadStyle}>
                <div>
                  <p style={sectionTitleStyle}>My Jobs</p>
                  <p style={sectionSubStyle}>
                    Select a job to track its applications and interviews.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPostJobOpen(true)}
                  style={primaryButtonStyle}
                >
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
                          <strong style={{ color: C.text, fontSize: 15 }}>
                            {job.title}
                          </strong>
                          <p style={{ margin: '5px 0 0', color: C.faint, fontSize: 12 }}>
                            {getCompany(job)} · {job.location ?? 'Location not set'} · {getWorkMode(job)}
                          </p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                            {getRequiredSkills(job).slice(0, 6).map((skill) => (
                              <span key={skill} style={skillPillStyle}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={statusPillStyle}>{job.status ?? 'active'}</span>
                          <p style={{ margin: '10px 0 0', color: C.faint, fontSize: 12 }}>
                            {Number(job._count?.applications ?? 0)} applicants
                          </p>
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
                  <p style={sectionTitleStyle}>Applications by Job</p>
                  <p style={sectionSubStyle}>
                    {selectedJob
                      ? `${selectedJob.title} · ${getCompany(selectedJob)}`
                      : 'Select a job first'}
                  </p>
                </div>

                <select
                  value={selectedJobId ?? ''}
                  onChange={(e) => setSelectedJobId(e.target.value || null)}
                  style={inputStyle}
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>

              {appsLoading ? (
                <p style={emptyTextStyle}>Loading applications...</p>
              ) : applications.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onShortlist={() => void shortlistApplication(app)}
                      onSchedule={() => {
                        setScheduleApplicationId(app.id);
                        setTab('schedule');
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p style={emptyTextStyle}>
                  No applications for this job yet. Candidate applications will appear here by jobId.
                </p>
              )}
            </section>
          )}

          {tab === 'schedule' && (
            <section style={panelStyle}>
              <p style={sectionTitleStyle}>Schedule Interview</p>
              <p style={sectionSubStyle}>
                Select one application, create an interview round, notify candidate, and generate room link.
              </p>

              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                <label style={fieldWrapStyle}>
                  <span style={labelStyle}>Application</span>
                  <select
                    value={scheduleApplicationId}
                    onChange={(e) => setScheduleApplicationId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select candidate application</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {getCandidateName(app)} · {normalizeStatus(app.status)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedApplication && (
                  <div style={miniInfoStyle}>
                    <strong>{getCandidateName(selectedApplication)}</strong>
                    <span>{selectedApplication.candidate?.email ?? 'No email shown'}</span>
                    <span>Status: {normalizeStatus(selectedApplication.status)}</span>
                  </div>
                )}

                <div style={twoColStyle}>
                  <label style={fieldWrapStyle}>
                    <span style={labelStyle}>Round Type</span>
                    <select
                      value={roundType}
                      onChange={(e) => setRoundType(e.target.value)}
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
                      onChange={(e) => setDurationMins(Number(e.target.value))}
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
                    onChange={(e) => setScheduleAt(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void scheduleInterview()}
                  disabled={scheduling}
                  style={{
                    ...primaryButtonStyle,
                    opacity: scheduling ? 0.65 : 1,
                    cursor: scheduling ? 'not-allowed' : 'pointer',
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
              <p style={sectionTitleStyle}>Interview Results & Pipeline</p>
              <p style={sectionSubStyle}>
                Results submitted from interview rounds will reflect here and in Recruitment tracking.
              </p>

              <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                {applications.length ? (
                  applications.map((app) => (
                    <div key={app.id} style={resultRowStyle}>
                      <div>
                        <strong style={{ color: C.text }}>{getCandidateName(app)}</strong>
                        <p style={{ margin: '4px 0 0', color: C.faint, fontSize: 12 }}>
                          {selectedJob?.title ?? app.jobs?.title ?? app.job?.title ?? 'Job'}
                        </p>
                      </div>

                      <span
                        style={{
                          ...statusPillStyle,
                          color: statusColor(app.status),
                          borderColor: `${statusColor(app.status)}55`,
                          background: `${statusColor(app.status)}14`,
                        }}
                      >
                        {normalizeStatus(app.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={emptyTextStyle}>No results yet.</p>
                )}
              </div>

              {dashboard && (
                <pre style={debugStyle}>
                  {JSON.stringify(dashboard, null, 2)}
                </pre>
              )}
            </section>
          )}
        </main>
      )}

      <PostJobModal
        open={postJobOpen}
        loading={postJobLoading}
        onClose={() => setPostJobOpen(false)}
        onSubmit={(form) => void createRecruiterJob(form)}
      />
    </div>
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

function JobSummary({ job }: { job: JobRow }) {
  return (
    <div style={summaryStyle}>
      <div>
        <strong style={{ color: C.text }}>{job.title}</strong>
        <p style={{ margin: '5px 0 0', color: C.faint, fontSize: 12 }}>
          {getCompany(job)} · {job.location ?? 'Location not set'} · {getEmploymentType(job)}
        </p>
      </div>

      <span style={statusPillStyle}>{job.status ?? 'active'}</span>
    </div>
  );
}

function ApplicationCard({
  app,
  onShortlist,
  onSchedule,
}: {
  app: ApplicationRow;
  onShortlist: () => void;
  onSchedule: () => void;
}) {
  const alreadyShortlisted = normalizeStatus(app.status).includes('shortlist');

  return (
    <article style={applicationCardStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: C.text }}>{getCandidateName(app)}</strong>
        <p style={{ margin: '5px 0 0', color: C.faint, fontSize: 12 }}>
          {app.candidate?.email ?? 'No email shown'}
        </p>
        <p style={{ margin: '8px 0 0', color: C.faint, fontSize: 11 }}>
          Applied: {formatDate(app.applied_at ?? app.appliedAt ?? app.created_at ?? app.createdAt)}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            ...statusPillStyle,
            color: statusColor(app.status),
            borderColor: `${statusColor(app.status)}55`,
            background: `${statusColor(app.status)}14`,
          }}
        >
          {normalizeStatus(app.status)}
        </span>

        <button
          type="button"
          onClick={onShortlist}
          style={secondaryButtonStyle}
        >
          {alreadyShortlisted ? 'Shortlisted' : 'Shortlist'}
        </button>

        <button
          type="button"
          onClick={onSchedule}
          style={primaryButtonStyle}
        >
          Schedule
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
  border: `1px solid transparent`,
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
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

const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2,6,23,0.82)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  zIndex: 60,
};

const modalCardStyle: CSSProperties = {
  width: 'min(780px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto',
  border: `1px solid ${C.borderStrong}`,
  background: '#0B1020',
  borderRadius: 24,
  padding: '1.35rem',
  boxShadow: '0 30px 100px rgba(0,0,0,0.55)',
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
  borderRadius: 16,
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
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

const summaryStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 16,
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
};

const miniInfoStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 14,
  padding: '12px 14px',
  display: 'grid',
  gap: 4,
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