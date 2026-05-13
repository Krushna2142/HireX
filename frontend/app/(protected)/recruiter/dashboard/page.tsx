'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

type RecruitmentTab =
  | 'overview'
  | 'applications'
  | 'shortlist'
  | 'schedule'
  | 'pipeline'
  | 'results'
  | 'jobs';

type JobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' | string;

type JobRow = {
  id: string;
  title?: string | null;
  company?: string | null;
  companyName?: string | null;
  company_name?: string | null;
  location?: string | null;
  workMode?: string | null;
  work_mode?: string | null;
  employmentType?: string | null;
  employment_type?: string | null;
  applicantCount?: number | null;
  applicant_count?: number | null;
  status?: JobStatus | null;
  createdAt?: string | null;
  created_at?: string | null;
  publishedAt?: string | null;
  published_at?: string | null;
};

type ApplicationRow = {
  id: string;
  status?: string | null;
  applicationStatus?: string | null;
  appliedAt?: string | null;
  applied_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  matchScore?: number | null;
  match_score?: number | null;
  atsScore?: number | null;
  ats_score?: number | null;

  candidate?: {
    id?: string;
    fullName?: string | null;
    full_name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  } | null;

  user?: {
    id?: string;
    fullName?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;

  resume?: {
    id?: string;
    fileName?: string | null;
    file_name?: string | null;
    originalFileName?: string | null;
    original_file_name?: string | null;
    publicUrl?: string | null;
    public_url?: string | null;
    storagePath?: string | null;
    storage_path?: string | null;
  } | null;

  resumeAnalysis?: {
    id?: string;
    score?: number | null;
    atsScore?: number | null;
    ats_score?: number | null;
    skills?: string[] | null;
    extractedSkills?: string[] | null;
    extracted_skills?: string[] | null;
    missingSkills?: string[] | null;
    missing_skills?: string[] | null;
    summary?: string | null;
  } | null;

  analysis?: any;

  job?: JobRow | null;
  jobs?: JobRow | null;

  candidateName?: string | null;
  candidate_name?: string | null;
  candidateEmail?: string | null;
  candidate_email?: string | null;
  jobTitle?: string | null;
  job_title?: string | null;
};

type InterviewRow = {
  id: string;
  current_stage?: string | null;
  status_code?: number | null;
  final_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  job_id?: string | null;
  candidate_id?: string | null;
  job_title?: string | null;
  company?: string | null;
  candidate_name?: string | null;
  candidate_email?: string | null;
  rounds?: InterviewRound[];
};

type InterviewRound = {
  id: string;
  round_number?: number | null;
  roundNumber?: number | null;
  round_type?: string | null;
  roundType?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  duration_mins?: number | null;
  durationMins?: number | null;
  mode?: string | null;
  meeting_join_url?: string | null;
  meetingJoinUrl?: string | null;
  meeting_room_id?: string | null;
  meetingRoomId?: string | null;
  result?: string | null;
  score?: number | null;
  feedback?: string | null;
};

type ScheduleForm = {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
  scheduledAt: string;
  durationMins: number;
  mode: 'video' | 'phone' | 'offline';
};

type ScheduleResult = {
  interviewId: string;
  roundId?: string | null;
  roomId?: string | null;
  joinUrl?: string | null;
  scheduledAt?: string | null;
};

const C = {
  bg: '#070B14',
  card: 'rgba(15,23,42,0.78)',
  card2: 'rgba(2,6,23,0.82)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(167,139,250,0.32)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  purple: '#A78BFA',
  sky: '#38BDF8',
  pink: '#F472B6',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#F87171',
  blue: '#60A5FA',
};

const TABS: Array<{ key: RecruitmentTab; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'applications', label: 'Applications', icon: '📥' },
  { key: 'shortlist', label: 'Shortlist', icon: '⭐' },
  { key: 'schedule', label: 'Scheduling', icon: '🗓️' },
  { key: 'pipeline', label: 'Pipeline', icon: '🧭' },
  { key: 'results', label: 'Results', icon: '🏁' },
  { key: 'jobs', label: 'Jobs', icon: '💼' },
];

const ROUND_TYPES = [
  { value: 'technical', label: 'Technical Round' },
  { value: 'hr', label: 'HR Round' },
  { value: 'managerial', label: 'Managerial Round' },
  { value: 'assignment', label: 'Assignment Review' },
] as const;

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; lane: string }
> = {
  applied: {
    label: 'Applied',
    color: C.sky,
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.25)',
    lane: 'New',
  },
  reviewed: {
    label: 'Reviewed',
    color: C.blue,
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
    lane: 'Review',
  },
  reviewing: {
    label: 'Reviewing',
    color: C.blue,
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
    lane: 'Review',
  },
  shortlisted: {
    label: 'Shortlisted',
    color: C.purple,
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.30)',
    lane: 'Shortlist',
  },
  interview: {
    label: 'Interview',
    color: C.amber,
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.30)',
    lane: 'Interview',
  },
  offered: {
    label: 'Offered',
    color: C.green,
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.30)',
    lane: 'Offer',
  },
  hired: {
    label: 'Hired',
    color: C.green,
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.35)',
    lane: 'Hired',
  },
  rejected: {
    label: 'Rejected',
    color: C.red,
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
    lane: 'Rejected',
  },
};

function normalizeStatus(status?: string | null): string {
  const value = String(status ?? 'applied').toLowerCase();

  if (value === 'under_review') return 'reviewing';
  if (value === 'shortlist') return 'shortlisted';
  if (value === 'shortlisted_for_interview') return 'shortlisted';
  if (value === 'interview_scheduled') return 'interview';
  if (value === 'interview_in_progress') return 'interview';
  if (value === 'interview_passed') return 'offered';
  if (value === 'selected') return 'hired';

  if (
    [
      'applied',
      'reviewed',
      'reviewing',
      'shortlisted',
      'interview',
      'offered',
      'rejected',
      'hired',
    ].includes(value)
  ) {
    return value;
  }

  return 'applied';
}

function backendStatus(status: string): string {
  switch (status) {
    case 'reviewing':
      return 'UNDER_REVIEW';
    case 'shortlisted':
      return 'SHORTLISTED';
    case 'interview':
      return 'INTERVIEW_SCHEDULED';
    case 'offered':
      return 'OFFERED';
    case 'hired':
      return 'HIRED';
    case 'rejected':
      return 'REJECTED';
    case 'reviewed':
      return 'UNDER_REVIEW';
    case 'applied':
    default:
      return 'APPLIED';
  }
}

function statusMeta(status?: string | null) {
  return STATUS_META[normalizeStatus(status)] ?? STATUS_META.applied;
}

function getJobId(job?: JobRow | null): string {
  return job?.id ?? '';
}

function getJobTitle(job?: JobRow | null): string {
  return job?.title ?? 'Untitled Job';
}

function getCompany(job?: JobRow | null): string {
  return job?.companyName ?? job?.company_name ?? job?.company ?? 'Company';
}

function getApplicantCount(job?: JobRow | null): number {
  return Number(job?.applicantCount ?? job?.applicant_count ?? 0);
}

function getCandidateName(app: ApplicationRow): string {
  return (
    app.candidate?.fullName ||
    app.candidate?.full_name ||
    app.user?.fullName ||
    app.user?.full_name ||
    app.candidateName ||
    app.candidate_name ||
    'Candidate'
  );
}

function getCandidateEmail(app: ApplicationRow): string {
  return (
    app.candidate?.email ||
    app.user?.email ||
    app.candidateEmail ||
    app.candidate_email ||
    'No email'
  );
}

function getJobFromApp(app: ApplicationRow, fallback?: JobRow | null): JobRow | null {
  return app.job ?? app.jobs ?? fallback ?? null;
}

function getJobTitleFromApp(app: ApplicationRow, fallback?: JobRow | null): string {
  const job = getJobFromApp(app, fallback);

  return app.jobTitle || app.job_title || getJobTitle(job);
}

function getCompanyFromApp(app: ApplicationRow, fallback?: JobRow | null): string {
  const job = getJobFromApp(app, fallback);

  return getCompany(job);
}

function getResumeLabel(app: ApplicationRow): string {
  return (
    app.resume?.originalFileName ||
    app.resume?.original_file_name ||
    app.resume?.fileName ||
    app.resume?.file_name ||
    'Resume attached'
  );
}

function getResumeUrl(app: ApplicationRow): string | null {
  return (
    app.resume?.publicUrl ||
    app.resume?.public_url ||
    app.resume?.storagePath ||
    app.resume?.storage_path ||
    null
  );
}

function getAtsScore(app: ApplicationRow): number | null {
  const possible =
    app.atsScore ??
    app.ats_score ??
    app.matchScore ??
    app.match_score ??
    app.resumeAnalysis?.atsScore ??
    app.resumeAnalysis?.ats_score ??
    app.resumeAnalysis?.score ??
    app.analysis?.score;

  const parsed = Number(possible);

  return Number.isFinite(parsed) ? parsed : null;
}

function getSkills(app: ApplicationRow): string[] {
  const skills =
    app.resumeAnalysis?.skills ??
    app.resumeAnalysis?.extractedSkills ??
    app.resumeAnalysis?.extracted_skills ??
    app.analysis?.skills ??
    [];

  return Array.isArray(skills) ? skills.slice(0, 8) : [];
}

function getMissingSkills(app: ApplicationRow): string[] {
  const skills =
    app.resumeAnalysis?.missingSkills ??
    app.resumeAnalysis?.missing_skills ??
    app.analysis?.missingSkills ??
    [];

  return Array.isArray(skills) ? skills.slice(0, 8) : [];
}

function getAppliedAt(app: ApplicationRow): string {
  return (
    app.appliedAt ||
    app.applied_at ||
    app.createdAt ||
    app.created_at ||
    new Date().toISOString()
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return 'Not set';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function percent(num: number, den: number) {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

function extractArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.applications)) return payload.applications;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function extractInterviewId(payload: any): string | null {
  return (
    payload?.id ||
    payload?.interview?.id ||
    payload?.data?.id ||
    payload?.data?.interview?.id ||
    payload?.interviewId ||
    payload?.data?.interviewId ||
    null
  );
}

function extractScheduleResult(interviewId: string, payload: any): ScheduleResult {
  const round = payload?.data ?? payload;

  return {
    interviewId,
    roundId: round?.id ?? round?.roundId ?? null,
    roomId: round?.meetingRoomId ?? round?.meeting_room_id ?? round?.roomId ?? null,
    joinUrl: round?.meetingJoinUrl ?? round?.meeting_join_url ?? round?.joinUrl ?? null,
    scheduledAt: round?.scheduledAt ?? round?.scheduled_at ?? null,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response === 'object' &&
    (error as any).response !== null
  ) {
    const data = (error as any).response.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

function StatCard({
  label,
  value,
  helper,
  accent = C.sky,
}: {
  label: string;
  value: number | string;
  helper?: string;
  accent?: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ color: C.faint, fontSize: 11, fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          color: accent,
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1,
          marginTop: 10,
          letterSpacing: '-0.05em',
        }}
      >
        {value}
      </div>
      {helper ? (
        <div style={{ color: C.faint, fontSize: 11, marginTop: 8 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const meta = statusMeta(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 999,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'capitalize',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: meta.color,
          boxShadow: `0 0 12px ${meta.color}`,
        }}
      />
      {meta.label}
    </span>
  );
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      style={{
        border: `1px dashed ${C.borderStrong}`,
        borderRadius: 18,
        padding: '2rem',
        textAlign: 'center',
        background: 'rgba(15,23,42,0.44)',
      }}
    >
      <div style={{ fontSize: 34, marginBottom: 10 }}>🧩</div>
      <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>{title}</h3>
      <p style={{ margin: '0.6rem auto 0', color: C.muted, maxWidth: 520 }}>
        {message}
      </p>
    </div>
  );
}

function ApplicantCard({
  app,
  selectedJob,
  onMove,
  onSchedule,
  moving,
}: {
  app: ApplicationRow;
  selectedJob?: JobRow | null;
  onMove: (app: ApplicationRow, status: string) => void;
  onSchedule: (app: ApplicationRow) => void;
  moving: boolean;
}) {
  const candidateName = getCandidateName(app);
  const candidateEmail = getCandidateEmail(app);
  const status = normalizeStatus(app.status ?? app.applicationStatus);
  const atsScore = getAtsScore(app);
  const resumeLabel = getResumeLabel(app);
  const resumeUrl = getResumeUrl(app);
  const skills = getSkills(app);
  const missingSkills = getMissingSkills(app);

  return (
    <div style={applicantCardStyle}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr) auto',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(167,139,250,0.22))',
                border: `1px solid ${C.borderStrong}`,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                color: C.text,
              }}
            >
              {candidateName.charAt(0).toUpperCase()}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: C.text,
                  fontSize: 15,
                  fontWeight: 900,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {candidateName}
              </div>
              <div
                style={{
                  color: C.faint,
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {candidateEmail}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 14,
            }}
          >
            <StatusPill status={status} />

            <span style={tinyBadgeStyle}>
              {getJobTitleFromApp(app, selectedJob)}
            </span>

            <span style={tinyBadgeStyle}>
              Applied {fmtDate(getAppliedAt(app))}
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: C.faint, fontSize: 11, marginBottom: 6 }}>
              Resume / ATS intelligence
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer" style={resumeLinkStyle}>
                  📄 {resumeLabel}
                </a>
              ) : (
                <span style={resumeLinkStyle}>📄 {resumeLabel}</span>
              )}

              {atsScore !== null ? (
                <span
                  style={{
                    ...resumeLinkStyle,
                    color:
                      atsScore >= 75
                        ? C.green
                        : atsScore >= 55
                          ? C.amber
                          : C.red,
                  }}
                >
                  ATS {atsScore}%
                </span>
              ) : (
                <span style={resumeLinkStyle}>ATS pending</span>
              )}
            </div>
          </div>

          {skills.length > 0 || missingSkills.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 12,
              }}
            >
              <TagBlock
                label="Matched skills"
                items={skills}
                color={C.green}
                empty="No extracted skills"
              />
              <TagBlock
                label="Missing / gap skills"
                items={missingSkills}
                color={C.amber}
                empty="No gap analysis"
              />
            </div>
          ) : null}
        </div>

        <div>
          <div style={{ color: C.faint, fontSize: 11, marginBottom: 8 }}>
            Candidate fit
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, atsScore ?? 0))}%`,
                background:
                  atsScore === null
                    ? C.faint
                    : atsScore >= 75
                      ? `linear-gradient(90deg, ${C.green}, ${C.sky})`
                      : atsScore >= 55
                        ? `linear-gradient(90deg, ${C.amber}, ${C.sky})`
                        : `linear-gradient(90deg, ${C.red}, ${C.pink})`,
              }}
            />
          </div>

          <p style={{ margin: 0, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
            {app.resumeAnalysis?.summary ||
              app.analysis?.summary ||
              'Resume analysis summary will appear here once ATS intelligence is available.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {status !== 'shortlisted' ? (
            <button
              type="button"
              disabled={moving}
              onClick={() => onMove(app, 'shortlisted')}
              style={primaryButtonStyle}
            >
              ⭐ Shortlist
            </button>
          ) : (
            <button
              type="button"
              disabled={moving}
              onClick={() => onSchedule(app)}
              style={primaryButtonStyle}
            >
              🗓️ Schedule
            </button>
          )}

          <button
            type="button"
            disabled={moving}
            onClick={() => onMove(app, 'reviewing')}
            style={secondaryButtonStyle}
          >
            Review
          </button>

          <button
            type="button"
            disabled={moving}
            onClick={() => onMove(app, 'rejected')}
            style={dangerButtonStyle}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function TagBlock({
  label,
  items,
  color,
  empty,
}: {
  label: string;
  items: string[];
  color: string;
  empty: string;
}) {
  return (
    <div>
      <div style={{ color: C.faint, fontSize: 11, marginBottom: 6 }}>{label}</div>

      {items.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {items.map((item) => (
            <span
              key={item}
              style={{
                border: `1px solid ${color}33`,
                background: `${color}12`,
                color,
                borderRadius: 999,
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <span style={{ color: C.faint, fontSize: 11 }}>{empty}</span>
      )}
    </div>
  );
}

function ScheduleModal({
  form,
  setForm,
  onClose,
  onSubmit,
  loading,
}: {
  form: ScheduleForm;
  setForm: (form: ScheduleForm) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: C.text, fontSize: 22 }}>
              Schedule Interview
            </h2>
            <p style={{ margin: '6px 0 0', color: C.muted, fontSize: 13 }}>
              {form.candidateName} · {form.jobTitle}
            </p>
          </div>

          <button type="button" onClick={onClose} style={iconButtonStyle}>
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Round type</span>
            <select
              value={form.roundType}
              onChange={(event) =>
                setForm({
                  ...form,
                  roundType: event.target.value as ScheduleForm['roundType'],
                })
              }
              style={inputStyle}
            >
              {ROUND_TYPES.map((round) => (
                <option key={round.value} value={round.value}>
                  {round.label}
                </option>
              ))}
            </select>
          </label>

          <label style={fieldWrapStyle}>
            <span style={labelStyle}>Scheduled date & time</span>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) =>
                setForm({
                  ...form,
                  scheduledAt: event.target.value,
                })
              }
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Duration</span>
              <input
                type="number"
                min={15}
                max={180}
                value={form.durationMins}
                onChange={(event) =>
                  setForm({
                    ...form,
                    durationMins: Number(event.target.value),
                  })
                }
                style={inputStyle}
              />
            </label>

            <label style={fieldWrapStyle}>
              <span style={labelStyle}>Mode</span>
              <select
                value={form.mode}
                onChange={(event) =>
                  setForm({
                    ...form,
                    mode: event.target.value as ScheduleForm['mode'],
                  })
                }
                style={inputStyle}
              >
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="offline">Offline</option>
              </select>
            </label>
          </div>

          <div
            style={{
              border: `1px solid ${C.borderStrong}`,
              borderRadius: 14,
              padding: 12,
              background: 'rgba(56,189,248,0.06)',
              color: C.muted,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            On schedule, backend will initialize recruiter interview, create a round,
            create a secure room, and return join URL/room ID when available.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={loading} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={loading} style={primaryButtonStyle}>
            {loading ? 'Scheduling...' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecruiterRecruitmentDashboardPage() {
  const router = useRouter();

  const [tab, setTab] = useState<RecruitmentTab>('overview');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm | null>(null);

  const selectedJob = useMemo(() => {
    if (selectedJobId === 'all') return null;
    return jobs.find((job) => getJobId(job) === selectedJobId) ?? null;
  }, [jobs, selectedJobId]);

  const filteredApplications = useMemo(() => {
    if (selectedJobId === 'all') return applications;

    return applications.filter((app) => {
      const job = getJobFromApp(app);
      return getJobId(job) === selectedJobId || (app as any).jobId === selectedJobId || (app as any).job_id === selectedJobId;
    });
  }, [applications, selectedJobId]);

  const stats = useMemo(() => {
    const total = filteredApplications.length;
    const shortlisted = filteredApplications.filter(
      (app) => normalizeStatus(app.status ?? app.applicationStatus) === 'shortlisted',
    ).length;
    const interviewing = filteredApplications.filter(
      (app) => normalizeStatus(app.status ?? app.applicationStatus) === 'interview',
    ).length;
    const offered = filteredApplications.filter(
      (app) => normalizeStatus(app.status ?? app.applicationStatus) === 'offered',
    ).length;
    const hired = filteredApplications.filter(
      (app) => normalizeStatus(app.status ?? app.applicationStatus) === 'hired',
    ).length;
    const rejected = filteredApplications.filter(
      (app) => normalizeStatus(app.status ?? app.applicationStatus) === 'rejected',
    ).length;

    const publishedJobs = jobs.filter((job) => String(job.status ?? '').toUpperCase() === 'PUBLISHED').length;
    const totalApplicants = applications.length;

    return {
      total,
      shortlisted,
      interviewing,
      offered,
      hired,
      rejected,
      publishedJobs,
      totalApplicants,
      shortlistRate: percent(shortlisted, total),
      hireRate: percent(hired, total),
      scheduledInterviews: interviews.filter((interview) =>
        ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS'].includes(
          String(interview.current_stage ?? ''),
        ),
      ).length,
      completedInterviews: interviews.filter((interview) =>
        ['INTERVIEW_PASSED', 'INTERVIEW_FAILED', 'HIRED', 'REJECTED'].includes(
          String(interview.current_stage ?? ''),
        ),
      ).length,
    };
  }, [applications, filteredApplications, interviews, jobs]);

  const shortlistedApps = useMemo(
    () =>
      filteredApplications.filter(
        (app) => normalizeStatus(app.status ?? app.applicationStatus) === 'shortlisted',
      ),
    [filteredApplications],
  );

  const resultApps = useMemo(
    () =>
      filteredApplications.filter((app) =>
        ['offered', 'hired', 'rejected'].includes(
          normalizeStatus(app.status ?? app.applicationStatus),
        ),
      ),
    [filteredApplications],
  );

  const pipelineGroups = useMemo(() => {
    const groups: Record<string, ApplicationRow[]> = {
      applied: [],
      reviewing: [],
      shortlisted: [],
      interview: [],
      offered: [],
      hired: [],
      rejected: [],
    };

    for (const app of filteredApplications) {
      const status = normalizeStatus(app.status ?? app.applicationStatus);
      if (!groups[status]) groups[status] = [];
      groups[status].push(app);
    }

    return groups;
  }, [filteredApplications]);

  async function loadData() {
    setLoading(true);

    try {
      const jobsResponse = await api.get('/jobs/mine');
      const loadedJobs = extractArray<JobRow>(jobsResponse.data);
      setJobs(loadedJobs);

      const applicantResults = await Promise.allSettled(
        loadedJobs.map(async (job) => {
          const jobId = getJobId(job);
          if (!jobId) return [];

          const res = await api.get(`/jobs/${encodeURIComponent(jobId)}/applicants`);
          const rows = extractArray<ApplicationRow>(res.data);

          return rows.map((row) => ({
            ...row,
            job: row.job ?? row.jobs ?? job,
          }));
        }),
      );

      const allApps = applicantResults.flatMap((result) =>
        result.status === 'fulfilled' ? result.value : [],
      );

      setApplications(allApps);

      try {
        const interviewsResponse = await api.get('/recruiter/interviews', {
          params: {
            limit: 100,
          },
        });
        setInterviews(extractArray<InterviewRow>(interviewsResponse.data));
      } catch {
        setInterviews([]);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load recruitment data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function moveApplication(app: ApplicationRow, status: string) {
    setMovingId(app.id);

    try {
      await api.patch(`/jobs/applications/${encodeURIComponent(app.id)}/status`, {
        status: backendStatus(status),
      });

      setApplications((current) =>
        current.map((item) =>
          item.id === app.id
            ? {
                ...item,
                status,
                applicationStatus: status,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      toast.success(`Candidate moved to ${statusMeta(status).label}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update application status'));
    } finally {
      setMovingId(null);
    }
  }

  function openSchedule(app: ApplicationRow) {
    const candidateName = getCandidateName(app);
    const jobTitle = getJobTitleFromApp(app, selectedJob);

    const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    defaultDate.setMinutes(0, 0, 0);

    setScheduleResult(null);
    setScheduleForm({
      applicationId: app.id,
      candidateName,
      jobTitle,
      roundType: 'technical',
      scheduledAt: defaultDate.toISOString().slice(0, 16),
      durationMins: 45,
      mode: 'video',
    });
  }

  async function scheduleInterview() {
    if (!scheduleForm) return;

    if (!scheduleForm.scheduledAt) {
      toast.error('Select interview date and time');
      return;
    }

    setScheduleLoading(true);

    try {
      const initResponse = await api.post(
        `/recruiter/interviews/${encodeURIComponent(scheduleForm.applicationId)}/init`,
      );

      const interviewId = extractInterviewId(initResponse.data);

      if (!interviewId) {
        throw new Error('Interview initialization did not return interview id');
      }

      const roundResponse = await api.post(
        `/recruiter/interviews/${encodeURIComponent(interviewId)}/rounds`,
        {
          roundType: scheduleForm.roundType,
          scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
          durationMins: scheduleForm.durationMins,
          mode: scheduleForm.mode,
        },
      );

      const result = extractScheduleResult(interviewId, roundResponse.data);
      setScheduleResult(result);

      await moveApplication(
        applications.find((app) => app.id === scheduleForm.applicationId) ?? {
          id: scheduleForm.applicationId,
        },
        'interview',
      );

      toast.success('Interview scheduled successfully');
      void loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to schedule interview'));
    } finally {
      setScheduleLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <style>
        {`
          @keyframes rcPulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
          @keyframes rcFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}
      </style>

      <header style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Recruitment Command Center</p>
          <h1 style={heroTitleStyle}>
            Track resumes, shortlist candidates, schedule interviews, and close hiring.
          </h1>
          <p style={heroTextStyle}>
            This section owns the full recruitment workflow. The main overview page can stay high-level; this page tracks every candidate movement from application to result.
          </p>
        </div>

        <div style={heroRightStyle}>
          <div style={{ color: C.faint, fontSize: 12, fontWeight: 800 }}>
            Selected job
          </div>
          <select
            value={selectedJobId}
            onChange={(event) => setSelectedJobId(event.target.value)}
            style={selectStyle}
          >
            <option value="all">All jobs</option>
            {jobs.map((job) => (
              <option key={getJobId(job)} value={getJobId(job)}>
                {getJobTitle(job)}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => void loadData()} style={secondaryButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      <section style={statsGridStyle}>
        <StatCard
          label="Applications"
          value={stats.total}
          helper={`${stats.totalApplicants} all jobs`}
          accent={C.sky}
        />
        <StatCard
          label="Shortlisted"
          value={stats.shortlisted}
          helper={`${stats.shortlistRate}% shortlist rate`}
          accent={C.purple}
        />
        <StatCard
          label="Interviews"
          value={stats.interviewing + stats.scheduledInterviews}
          helper={`${stats.completedInterviews} completed`}
          accent={C.amber}
        />
        <StatCard
          label="Hired"
          value={stats.hired}
          helper={`${stats.hireRate}% hire rate`}
          accent={C.green}
        />
      </section>

      <nav style={tabsStyle}>
        {TABS.map((item) => {
          const active = tab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              style={{
                ...tabButtonStyle,
                borderColor: active ? C.borderStrong : C.border,
                background: active
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))'
                  : 'rgba(15,23,42,0.50)',
                color: active ? C.text : C.muted,
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div style={loadingGridStyle}>
          {[1, 2, 3].map((item) => (
            <div key={item} style={loadingCardStyle} />
          ))}
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <section style={sectionGridStyle}>
              <div style={cardStyle}>
                <SectionTitle
                  title="Recruitment Funnel"
                  subtitle="Live funnel from applications to hire."
                />

                <FunnelRow label="Applications" value={stats.total} total={stats.total} color={C.sky} />
                <FunnelRow label="Shortlisted" value={stats.shortlisted} total={stats.total} color={C.purple} />
                <FunnelRow label="Interview" value={stats.interviewing} total={stats.total} color={C.amber} />
                <FunnelRow label="Offered" value={stats.offered} total={stats.total} color={C.green} />
                <FunnelRow label="Hired" value={stats.hired} total={stats.total} color={C.green} />
                <FunnelRow label="Rejected" value={stats.rejected} total={stats.total} color={C.red} />
              </div>

              <div style={cardStyle}>
                <SectionTitle
                  title="Priority Shortlist"
                  subtitle="Candidates ready for scheduling."
                />

                {shortlistedApps.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {shortlistedApps.slice(0, 5).map((app) => (
                      <MiniCandidate
                        key={app.id}
                        app={app}
                        onSchedule={() => openSchedule(app)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No shortlisted candidates"
                    message="Move strong applicants to shortlist, then schedule interviews from here."
                  />
                )}
              </div>
            </section>
          )}

          {tab === 'applications' && (
            <section style={cardStyle}>
              <SectionTitle
                title="Applications Received"
                subtitle="Review resumes, ATS score, skills, and decide shortlist/reject."
              />

              {filteredApplications.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredApplications.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      selectedJob={selectedJob}
                      moving={movingId === app.id}
                      onMove={moveApplication}
                      onSchedule={openSchedule}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No applications found"
                  message="Once candidates apply to your jobs, resumes and ATS data will appear here."
                />
              )}
            </section>
          )}

          {tab === 'shortlist' && (
            <section style={cardStyle}>
              <SectionTitle
                title="Shortlisted Candidates"
                subtitle="Candidates ready for interview scheduling."
              />

              {shortlistedApps.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {shortlistedApps.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      selectedJob={selectedJob}
                      moving={movingId === app.id}
                      onMove={moveApplication}
                      onSchedule={openSchedule}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Shortlist is empty"
                  message="Shortlist candidates from Applications after reviewing their resume, skills, and ATS score."
                />
              )}
            </section>
          )}

          {tab === 'schedule' && (
            <section style={cardStyle}>
              <SectionTitle
                title="Interview Scheduling"
                subtitle="Schedule shortlisted candidates into recruiter-led interview rounds."
              />

              {shortlistedApps.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {shortlistedApps.map((app) => (
                    <MiniCandidate
                      key={app.id}
                      app={app}
                      onSchedule={() => openSchedule(app)}
                      detailed
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No candidates ready for scheduling"
                  message="Shortlisted candidates will appear here. Scheduling creates interview, round, room, and join URL."
                />
              )}
            </section>
          )}

          {tab === 'pipeline' && (
            <section style={pipelineGridStyle}>
              {Object.entries(pipelineGroups).map(([status, rows]) => (
                <div key={status} style={pipelineColumnStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <h3 style={{ margin: 0, color: statusMeta(status).color, fontSize: 14 }}>
                      {statusMeta(status).label}
                    </h3>
                    <span style={tinyBadgeStyle}>{rows.length}</span>
                  </div>

                  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    {rows.length ? (
                      rows.slice(0, 12).map((app) => (
                        <div key={app.id} style={pipelineCardStyle}>
                          <div style={{ color: C.text, fontWeight: 900, fontSize: 13 }}>
                            {getCandidateName(app)}
                          </div>
                          <div style={{ color: C.faint, fontSize: 11, marginTop: 2 }}>
                            {getJobTitleFromApp(app, selectedJob)}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <StatusPill status={status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: C.faint, fontSize: 12, padding: '1rem 0' }}>
                        Empty lane
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {tab === 'results' && (
            <section style={cardStyle}>
              <SectionTitle
                title="Interview Results & Final Decisions"
                subtitle="Final recruitment decisions stay here even though live interview happens in Interviews section."
              />

              {resultApps.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {resultApps.map((app) => (
                    <ApplicantCard
                      key={app.id}
                      app={app}
                      selectedJob={selectedJob}
                      moving={movingId === app.id}
                      onMove={moveApplication}
                      onSchedule={openSchedule}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No final results yet"
                  message="After interviews and feedback, offered, hired, and rejected candidates will be tracked here."
                />
              )}
            </section>
          )}

          {tab === 'jobs' && (
            <section style={cardStyle}>
              <SectionTitle
                title="Recruiter Jobs"
                subtitle="Every job and its recruitment volume."
              />

              {jobs.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {jobs.map((job) => (
                    <button
                      key={getJobId(job)}
                      type="button"
                      onClick={() => {
                        setSelectedJobId(getJobId(job));
                        setTab('applications');
                      }}
                      style={jobCardStyle}
                    >
                      <div>
                        <div style={{ color: C.text, fontSize: 16, fontWeight: 900 }}>
                          {getJobTitle(job)}
                        </div>
                        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                          {getCompany(job)} · {job.location ?? 'Location not set'} ·{' '}
                          {job.workMode ?? job.work_mode ?? 'Mode not set'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={tinyBadgeStyle}>
                          {getApplicantCount(job)} applicants
                        </span>
                        <span style={tinyBadgeStyle}>
                          {String(job.status ?? 'DRAFT')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No jobs posted"
                  message="Post jobs first. Applications and recruitment tracking will connect to those jobs."
                />
              )}
            </section>
          )}
        </>
      )}

      {scheduleForm && (
        <ScheduleModal
          form={scheduleForm}
          setForm={setScheduleForm}
          loading={scheduleLoading}
          onClose={() => setScheduleForm(null)}
          onSubmit={() => void scheduleInterview()}
        />
      )}

      {scheduleResult && (
        <div style={resultToastStyle}>
          <div>
            <strong style={{ color: C.text }}>Interview scheduled</strong>
            <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 12 }}>
              Room: {scheduleResult.roomId ?? 'created'} ·{' '}
              {fmtDate(scheduleResult.scheduledAt)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {scheduleResult.joinUrl ? (
              <button
                type="button"
                onClick={() => router.push(scheduleResult.joinUrl || '')}
                style={primaryButtonStyle}
              >
                Open Room
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setScheduleResult(null)}
              style={secondaryButtonStyle}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ margin: 0, color: C.text, fontSize: 20, letterSpacing: '-0.03em' }}>
        {title}
      </h2>
      <p style={{ margin: '6px 0 0', color: C.muted, fontSize: 13 }}>
        {subtitle}
      </p>
    </div>
  );
}

function FunnelRow({
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
  const pct = percent(value, total);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color, fontSize: 13, fontWeight: 800 }}>{label}</span>
        <span style={{ color: C.muted, fontSize: 12 }}>
          {value} · {pct}%
        </span>
      </div>

      <div
        style={{
          height: 8,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function MiniCandidate({
  app,
  onSchedule,
  detailed = false,
}: {
  app: ApplicationRow;
  onSchedule: () => void;
  detailed?: boolean;
}) {
  const atsScore = getAtsScore(app);

  return (
    <div style={miniCandidateStyle}>
      <div>
        <div style={{ color: C.text, fontWeight: 900 }}>
          {getCandidateName(app)}
        </div>
        <div style={{ color: C.faint, fontSize: 12, marginTop: 3 }}>
          {getJobTitleFromApp(app)} · {getCandidateEmail(app)}
        </div>

        {detailed ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <StatusPill status={app.status} />
            <span style={tinyBadgeStyle}>
              ATS {atsScore ?? 'pending'}
              {atsScore !== null ? '%' : ''}
            </span>
            <span style={tinyBadgeStyle}>{getResumeLabel(app)}</span>
          </div>
        ) : null}
      </div>

      <button type="button" onClick={onSchedule} style={primaryButtonStyle}>
        Schedule
      </button>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '2rem',
  color: C.text,
  background:
    'radial-gradient(circle at top left, rgba(56,189,248,0.10), transparent 32%), radial-gradient(circle at top right, rgba(244,114,182,0.12), transparent 28%), #070B14',
  animation: 'rcFade .25s ease',
};

const heroStyle: CSSProperties = {
  border: `1px solid ${C.borderStrong}`,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
  borderRadius: 26,
  padding: '1.5rem',
  display: 'grid',
  gridTemplateColumns: '1fr 300px',
  gap: 20,
  boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: C.sky,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const heroTitleStyle: CSSProperties = {
  margin: '0.5rem 0 0',
  fontSize: 32,
  lineHeight: 1.08,
  letterSpacing: '-0.055em',
  maxWidth: 860,
};

const heroTextStyle: CSSProperties = {
  margin: '0.9rem 0 0',
  color: C.muted,
  lineHeight: 1.7,
  fontSize: 14,
  maxWidth: 820,
};

const heroRightStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: 14,
  background: 'rgba(2,6,23,0.55)',
  display: 'grid',
  gap: 10,
  alignSelf: 'start',
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 14,
  marginTop: 16,
};

const statCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.84), rgba(2,6,23,0.78))',
  borderRadius: 18,
  padding: '1rem',
  minHeight: 96,
};

const tabsStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 18,
  marginBottom: 18,
};

const tabButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '10px 13px',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const cardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.82), rgba(2,6,23,0.86))',
  borderRadius: 22,
  padding: '1.25rem',
  boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
};

const sectionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
};

const applicantCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.68), rgba(2,6,23,0.68))',
  borderRadius: 18,
  padding: '1rem',
};

const tinyBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 8px',
  borderRadius: 999,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.035)',
  color: C.muted,
  fontSize: 11,
  fontWeight: 800,
};

const resumeLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 9px',
  borderRadius: 999,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.035)',
  color: C.sky,
  fontSize: 11,
  fontWeight: 800,
  textDecoration: 'none',
};

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 12px',
  color: '#020617',
  fontWeight: 900,
  cursor: 'pointer',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
  boxShadow: '0 16px 38px rgba(56,189,248,0.14)',
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '9px 12px',
  color: C.text,
  fontWeight: 800,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
  whiteSpace: 'nowrap',
};

const dangerButtonStyle: CSSProperties = {
  border: `1px solid rgba(248,113,113,0.28)`,
  borderRadius: 12,
  padding: '9px 12px',
  color: C.red,
  fontWeight: 800,
  cursor: 'pointer',
  background: 'rgba(248,113,113,0.08)',
  whiteSpace: 'nowrap',
};

const selectStyle: CSSProperties = {
  width: '100%',
  border: `1px solid ${C.border}`,
  background: 'rgba(2,6,23,0.72)',
  color: C.text,
  borderRadius: 12,
  padding: '10px 12px',
  outline: 'none',
};

const pipelineGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(180px, 1fr))',
  gap: 12,
  overflowX: 'auto',
};

const pipelineColumnStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(15,23,42,0.62)',
  borderRadius: 18,
  padding: 12,
  minHeight: 320,
};

const pipelineCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(2,6,23,0.66)',
  borderRadius: 14,
  padding: 10,
};

const jobCardStyle: CSSProperties = {
  width: '100%',
  border: `1px solid ${C.border}`,
  background: 'rgba(15,23,42,0.58)',
  borderRadius: 16,
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  textAlign: 'left',
  cursor: 'pointer',
};

const miniCandidateStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: '1rem',
  background: 'rgba(15,23,42,0.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  background: 'rgba(2,6,23,0.82)',
  backdropFilter: 'blur(12px)',
};

const modalStyle: CSSProperties = {
  width: 'min(560px, 100%)',
  border: `1px solid ${C.borderStrong}`,
  borderRadius: 22,
  padding: '1.25rem',
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
  boxShadow: '0 30px 100px rgba(0,0,0,0.50)',
};

const iconButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.035)',
  color: C.text,
  fontSize: 20,
  cursor: 'pointer',
};

const fieldWrapStyle: CSSProperties = {
  display: 'block',
};

const labelStyle: CSSProperties = {
  display: 'block',
  color: C.faint,
  fontSize: 11,
  fontWeight: 900,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${C.border}`,
  background: 'rgba(2,6,23,0.72)',
  color: C.text,
  borderRadius: 12,
  padding: '11px 12px',
  outline: 'none',
};

const resultToastStyle: CSSProperties = {
  position: 'fixed',
  right: 20,
  bottom: 20,
  zIndex: 900,
  width: 'min(520px, calc(100vw - 40px))',
  border: `1px solid ${C.borderStrong}`,
  borderRadius: 18,
  padding: 14,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  boxShadow: '0 20px 70px rgba(0,0,0,0.45)',
};

const loadingGridStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
};

const loadingCardStyle: CSSProperties = {
  height: 220,
  borderRadius: 22,
  background: 'rgba(255,255,255,0.05)',
  animation: 'rcPulse 1.4s ease infinite',
};