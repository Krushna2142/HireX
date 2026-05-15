'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/recruiter/interviews/page.tsx

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

import { interviewApi, type InterviewStage } from '@/lib/axios';

type RoundType = 'technical' | 'hr' | 'managerial' | 'assignment';
type RoundMode = 'video' | 'phone' | 'offline';
type RoundResult = 'pass' | 'fail' | 'pending' | 'no_show' | 'reschedule';

type ScheduleRoundPayload = {
  roundType: RoundType;
  scheduledAt: string;
  durationMins?: number;
  mode?: RoundMode;
  interviewerId?: string;
};

type RecruiterInterview = {
  id: string;
  current_stage?: InterviewStage | string | null;
  currentStage?: InterviewStage | string | null;
  status_code?: number | null;
  statusCode?: number | null;
  final_status?: string | null;
  finalStatus?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  job_id?: string | null;
  jobId?: string | null;
  candidate_id?: string | null;
  candidateId?: string | null;
  job_title?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  candidate_name?: string | null;
  candidateName?: string | null;
  candidate_email?: string | null;
  candidateEmail?: string | null;
};

type RoundItem = {
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
  joinUrl?: string | null;
  result?: string | null;
  score?: number | null;
  feedback?: string | null;
};

type InterviewEvent = {
  id: string;
  event_type?: string | null;
  eventType?: string | null;
  from_stage?: string | null;
  fromStage?: string | null;
  to_stage?: string | null;
  toStage?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  createdAt?: string | null;
};

const ROUND_TYPES: RoundType[] = ['technical', 'hr', 'managerial', 'assignment'];
const ROUND_MODES: RoundMode[] = ['video', 'phone', 'offline'];
const ROUND_RESULTS: { value: RoundResult; label: string }[] = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'pending', label: 'Pending' },
  { value: 'no_show', label: 'No Show' },
  { value: 'reschedule', label: 'Reschedule' },
];

const JOIN_OPEN_BEFORE_MINUTES = 15;
const JOIN_CLOSE_AFTER_MINUTES = 20;

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(167,139,250,0.30)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
  orange: '#FB923C',
};

const STAGE_OPTIONS: InterviewStage[] = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_IN_PROGRESS',
  'INTERVIEW_PASSED',
  'INTERVIEW_FAILED',
  'FINAL_REVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'ON_HOLD',
  'WITHDRAWN',
] as InterviewStage[];

const STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  INTERVIEW_IN_PROGRESS: 'Interview In Progress',
  INTERVIEW_PASSED: 'Interview Passed',
  INTERVIEW_FAILED: 'Interview Failed',
  FINAL_REVIEW: 'Final Review',
  OFFERED: 'Offered',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
  ON_HOLD: 'On Hold',
  WITHDRAWN: 'Withdrawn',
};

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

function safeUpper(value: unknown, fallback = ''): string {
  return safeString(value, fallback).toUpperCase();
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toArray<T>(raw: unknown, key?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  const keys = ['data', 'items', 'results', 'interviews', 'rounds', 'events', key].filter(Boolean) as string[];

  for (const candidate of keys) {
    const value = obj[candidate];

    if (Array.isArray(value)) return value as T[];

    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;

      if (Array.isArray(nested.data)) return nested.data as T[];
      if (Array.isArray(nested.items)) return nested.items as T[];
      if (Array.isArray(nested.results)) return nested.results as T[];
      if (Array.isArray(nested.interviews)) return nested.interviews as T[];
      if (Array.isArray(nested.rounds)) return nested.rounds as T[];
      if (Array.isArray(nested.events)) return nested.events as T[];
    }
  }

  return [];
}

function getErrorMessage(error: unknown, fallback: string): string {
  const anyError = error as any;

  return safeString(
    anyError?.response?.data?.detail ??
      anyError?.response?.data?.message ??
      anyError?.response?.data?.error ??
      anyError?.message,
    fallback,
  );
}

function normalizeStage(stage?: string | null): InterviewStage {
  const value = safeUpper(stage, 'APPLIED').replace(/\s+/g, '_');

  if (STAGE_OPTIONS.includes(value as InterviewStage)) {
    return value as InterviewStage;
  }

  return 'APPLIED' as InterviewStage;
}

function getStage(item?: RecruiterInterview | null): InterviewStage {
  return normalizeStage(item?.current_stage ?? item?.currentStage ?? item?.final_status ?? item?.finalStatus);
}

function getStageLabel(stage?: string | null): string {
  const normalized = normalizeStage(stage);
  return STAGE_LABELS[normalized] ?? 'Applied';
}

function getCandidateName(item?: RecruiterInterview | null): string {
  return safeString(item?.candidateName ?? item?.candidate_name, 'Candidate');
}

function getCandidateEmail(item?: RecruiterInterview | null): string {
  return safeString(item?.candidateEmail ?? item?.candidate_email, 'No email shown');
}

function getJobTitle(item?: RecruiterInterview | null): string {
  return safeString(item?.jobTitle ?? item?.job_title, 'Job');
}

function getCompany(item?: RecruiterInterview | null): string {
  return safeString(item?.companyName ?? item?.company_name ?? item?.company, 'Company');
}

function getRoundNumber(round?: RoundItem | null): number {
  return safeNumber(round?.round_number ?? round?.roundNumber, 1);
}

function getRoundType(round?: RoundItem | null): string {
  return safeString(round?.round_type ?? round?.roundType, 'technical');
}

function getRoundScheduledAt(round?: RoundItem | null): string | null {
  return round?.scheduled_at ?? round?.scheduledAt ?? null;
}

function getRoundDuration(round?: RoundItem | null): number {
  return safeNumber(round?.duration_mins ?? round?.durationMins, 45);
}

function getRoundResult(round?: RoundItem | null): string {
  return safeString(round?.result).toLowerCase();
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not scheduled';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRoomPath(interviewId: string, round?: RoundItem | null): string {
  return `/interviews/room/jc-${interviewId}-r${getRoundNumber(round)}`;
}

function getRoundTimeInfo(round?: RoundItem | null) {
  const scheduledAt = getRoundScheduledAt(round);

  if (!scheduledAt) {
    return {
      valid: false,
      nowMs: Date.now(),
      startMs: 0,
      openMs: 0,
      closeMs: 0,
    };
  }

  const startMs = new Date(scheduledAt).getTime();
  const durationMs = getRoundDuration(round) * 60 * 1000;

  return {
    valid: Number.isFinite(startMs),
    nowMs: Date.now(),
    startMs,
    openMs: startMs - JOIN_OPEN_BEFORE_MINUTES * 60 * 1000,
    closeMs: startMs + durationMs + JOIN_CLOSE_AFTER_MINUTES * 60 * 1000,
  };
}

function canJoinRound(round?: RoundItem | null): boolean {
  const result = getRoundResult(round);

  if (result && !['pending', 'reschedule'].includes(result)) return false;

  const time = getRoundTimeInfo(round);

  return time.valid && time.nowMs >= time.openMs && time.nowMs <= time.closeMs;
}

function getRoundStatus(round?: RoundItem | null) {
  const result = getRoundResult(round);

  if (result === 'pass') return { label: 'Passed', color: C.green };
  if (result === 'fail') return { label: 'Failed', color: C.red };
  if (result === 'no_show') return { label: 'No Show', color: C.red };
  if (result === 'reschedule') return { label: 'Needs Reschedule', color: C.yellow };

  const time = getRoundTimeInfo(round);

  if (!time.valid) return { label: 'Scheduled', color: C.yellow };

  if (time.nowMs < time.openMs) {
    const minutes = Math.max(1, Math.ceil((time.openMs - time.nowMs) / 60_000));
    return { label: `Join opens in ${minutes}m`, color: C.faint };
  }

  if (time.nowMs >= time.openMs && time.nowMs <= time.closeMs) {
    return { label: 'Join now', color: C.green };
  }

  return { label: 'Waiting feedback', color: C.yellow };
}

function getNextRound(rounds: RoundItem[]): RoundItem | null {
  const now = Date.now() - 60 * 60 * 1000;

  const active = rounds
    .filter((round) => {
      const scheduledAt = getRoundScheduledAt(round);
      if (!scheduledAt) return false;

      const start = new Date(scheduledAt).getTime();
      if (!Number.isFinite(start)) return false;

      const result = getRoundResult(round);
      const terminal = ['pass', 'fail', 'no_show'].includes(result);

      return start >= now && !terminal;
    })
    .sort((a, b) => {
      const aTime = new Date(getRoundScheduledAt(a) ?? '').getTime();
      const bTime = new Date(getRoundScheduledAt(b) ?? '').getTime();
      return aTime - bTime;
    });

  return active[0] ?? null;
}

function formatEvent(event: InterviewEvent): string {
  const type = safeString(event.event_type ?? event.eventType);
  const fromStage = safeString(event.from_stage ?? event.fromStage);
  const toStage = safeString(event.to_stage ?? event.toStage);

  if (type === 'STATUS_CHANGED' || type === 'stage_changed') {
    return `Stage moved from ${fromStage || 'unknown'} to ${toStage || 'unknown'}`;
  }

  if (type === 'round_scheduled') return 'Interview round scheduled';
  if (type === 'ROUND_COMPLETED') return 'Interview round completed';
  if (type === 'round_result_submitted') return 'Round result submitted';
  if (type === 'room_started') return 'Interview room started';
  if (type === 'room_ended') return 'Interview room ended';

  return type ? type.replaceAll('_', ' ') : 'Interview updated';
}

function ScheduleModal({
  open,
  title,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: ScheduleRoundPayload) => void;
}) {
  const [roundType, setRoundType] = useState<RoundType>('technical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode, setMode] = useState<RoundMode>('video');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setRoundType('technical');
    setScheduledAt('');
    setDurationMins(45);
    setMode('video');
    setError('');
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!scheduledAt) {
      setError('Select interview date and time.');
      return;
    }

    onSubmit({
      roundType,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMins: Number(durationMins) || 45,
      mode,
    });
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <section style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>Interview Scheduling</p>
            <h2 style={modalTitleStyle}>{title}</h2>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Round Type</span>
            <div style={roundTypeWrapStyle}>
              {ROUND_TYPES.map((item) => {
                const active = roundType === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRoundType(item)}
                    style={{
                      ...roundTypeButtonStyle,
                      ...(active ? activeRoundTypeButtonStyle : {}),
                    }}
                  >
                    {safeString(item, 'round').replaceAll('_', ' ')}
                  </button>
                );
              })}
            </div>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Date & Time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={twoColStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Duration</span>
              <input
                type="number"
                min={15}
                step={5}
                value={durationMins}
                onChange={(event) => setDurationMins(Number(event.target.value))}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Mode</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as RoundMode)}
                style={inputStyle}
              >
                {ROUND_MODES.map((item) => (
                  <option key={item} value={item}>
                    {safeString(item, 'video').replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <div style={errorTextStyle}>{error}</div>}
        </div>

        <div style={modalFooterStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            style={{
              ...primaryButtonStyle,
              opacity: busy ? 0.6 : 1,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Scheduling...' : 'Save Round'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function RecruiterInterviewsPage() {
  const router = useRouter();

  const [items, setItems] = useState<RecruiterInterview[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const [, forceClock] = useState(0);

  const selectedInterview = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const nextRound = useMemo(() => getNextRound(rounds), [rounds]);

  useEffect(() => {
    const timer = window.setInterval(() => forceClock((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await interviewApi.listRecruiterInterviews({ limit: 200 });
      const rows = toArray<RecruiterInterview>(response.data, 'interviews').filter(
        (item) => item && typeof item === 'object' && item.id,
      );

      setItems(rows);

      setSelectedId((current) => {
        if (current && rows.some((item) => item.id === current)) return current;
        return rows[0]?.id ?? '';
      });
    } catch (err) {
      setItems([]);
      setError(getErrorMessage(err, 'Failed to load recruiter interviews.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (interviewId: string) => {
    if (!interviewId) {
      setRounds([]);
      setEvents([]);
      return;
    }

    setDetailLoading(true);

    try {
      const response = await interviewApi.getRecruiterInterview(interviewId);
      setRounds(toArray<RoundItem>(response.data, 'rounds'));
      setEvents(toArray<InterviewEvent>(response.data, 'events'));
    } catch {
      setRounds([]);
      setEvents([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const stats = useMemo(() => {
    const total = items.length;

    const scheduled = items.filter((item) => {
      const stage = getStage(item);
      return stage === 'INTERVIEW_SCHEDULED' || stage === 'INTERVIEW_IN_PROGRESS';
    }).length;

    const active = items.filter((item) => {
      const stage = getStage(item);
      return ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'FINAL_REVIEW'].includes(stage);
    }).length;

    const hired = items.filter((item) => getStage(item) === 'HIRED').length;

    return { total, scheduled, active, hired };
  }, [items]);

  async function scheduleRound(payload: ScheduleRoundPayload) {
    if (!selectedInterview) return;

    setScheduleBusy(true);
    setError('');

    try {
      await interviewApi.scheduleRound(selectedInterview.id, payload);
      setScheduleOpen(false);

      await Promise.all([
        loadList(),
        loadDetail(selectedInterview.id),
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to schedule interview round.'));
    } finally {
      setScheduleBusy(false);
    }
  }

  async function updateStage(stage: InterviewStage) {
    if (!selectedInterview) return;

    setStageBusy(true);
    setError('');

    try {
      await interviewApi.updateStage(selectedInterview.id, stage);

      setItems((current) =>
        current.map((item) =>
          item.id === selectedInterview.id
            ? { ...item, current_stage: stage }
            : item,
        ),
      );

      await loadDetail(selectedInterview.id);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update interview stage.'));
    } finally {
      setStageBusy(false);
    }
  }

  async function submitRoundResult(roundId: string, result: RoundResult) {
    if (!selectedInterview) return;

    setError('');

    try {
      await interviewApi.submitRoundResult(roundId, { result });
      await Promise.all([
        loadList(),
        loadDetail(selectedInterview.id),
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update round result.'));
    }
  }

  function joinRound(round: RoundItem) {
    if (!selectedInterview) return;
    router.push(getRoomPath(selectedInterview.id, round));
  }

  const scheduleTitle = rounds.length
    ? 'Reschedule / Add Next Round'
    : 'Schedule First Interview Round';

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Recruiter Interviews</h1>
          <p style={subtitleStyle}>
            Schedule rounds, track outcomes, join rooms, and submit feedback.
          </p>
        </div>

        <button type="button" onClick={() => void loadList()} style={secondaryButtonStyle}>
          Refresh
        </button>
      </header>

      {error && <section style={errorBoxStyle}>{error}</section>}

      <section style={statsGridStyle}>
        <StatCard label="Tracked" value={stats.total} color={C.sky} />
        <StatCard label="Scheduled" value={stats.scheduled} color={C.purple} />
        <StatCard label="Active Review" value={stats.active} color={C.yellow} />
        <StatCard label="Hired" value={stats.hired} color={C.green} />
      </section>

      <section style={workspaceStyle}>
        <aside style={listPanelStyle}>
          <div style={panelHeaderStyle}>
            <strong>Interviews</strong>
            <span>{items.length}</span>
          </div>

          <div style={scrollListStyle}>
            {loading ? (
              <div style={emptyStateStyle}>Loading interviews...</div>
            ) : items.length ? (
              items.map((item) => {
                const stage = getStage(item);
                const active = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      ...interviewRowStyle,
                      borderColor: active ? C.borderStrong : C.border,
                      background: active ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.025)',
                    }}
                  >
                    <strong style={rowTitleStyle}>{getJobTitle(item)}</strong>
                    <span style={rowSubStyle}>
                      {getCompany(item)} · {getCandidateName(item)}
                    </span>
                    <span style={stageBadgeStyle}>{getStageLabel(stage)}</span>
                  </button>
                );
              })
            ) : (
              <div style={emptyStateStyle}>No interviews found.</div>
            )}
          </div>
        </aside>

        <section style={detailPanelStyle}>
          {!selectedInterview ? (
            <div style={emptyStateStyle}>Select an interview to view details.</div>
          ) : (
            <>
              <div style={detailHeaderStyle}>
                <div>
                  <h2 style={detailTitleStyle}>{getJobTitle(selectedInterview)}</h2>
                  <p style={detailSubStyle}>
                    {getCompany(selectedInterview)} · {getCandidateName(selectedInterview)} ({getCandidateEmail(selectedInterview)})
                  </p>
                </div>

                <div style={detailActionRowStyle}>
                  <select
                    value={getStage(selectedInterview)}
                    disabled={stageBusy}
                    onChange={(event) => void updateStage(event.target.value as InterviewStage)}
                    style={selectStyle}
                  >
                    {STAGE_OPTIONS.map((stage) => (
                      <option key={stage} value={stage}>
                        {getStageLabel(stage)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setScheduleOpen(true)}
                    style={rounds.length ? secondaryButtonStyle : primaryButtonStyle}
                  >
                    {rounds.length ? 'Reschedule / Add Round' : 'Schedule Round'}
                  </button>
                </div>
              </div>

              {nextRound && (
                <section style={nextRoundStyle}>
                  <div>
                    <p style={eyebrowStyle}>Next Scheduled Round</p>
                    <strong>
                      Round {getRoundNumber(nextRound)} · {safeUpper(getRoundType(nextRound), 'TECHNICAL')}
                    </strong>
                    <p style={detailSubStyle}>
                      {formatDateTime(getRoundScheduledAt(nextRound))} · {getRoundDuration(nextRound)} min · {safeString(nextRound.mode, 'video')}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        ...statusPillStyle,
                        color: getRoundStatus(nextRound).color,
                        borderColor: `${getRoundStatus(nextRound).color}55`,
                        background: `${getRoundStatus(nextRound).color}14`,
                      }}
                    >
                      {getRoundStatus(nextRound).label}
                    </span>

                    {canJoinRound(nextRound) && (
                      <button type="button" onClick={() => joinRound(nextRound)} style={joinButtonStyle}>
                        Join Room
                      </button>
                    )}
                  </div>
                </section>
              )}

              <section style={{ marginTop: 18 }}>
                <p style={sectionTitleStyle}>Rounds</p>

                {detailLoading ? (
                  <div style={emptyStateStyle}>Loading rounds...</div>
                ) : rounds.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {rounds.map((round) => {
                      const status = getRoundStatus(round);
                      const joinable = canJoinRound(round);

                      return (
                        <article key={round.id} style={roundCardStyle}>
                          <div>
                            <strong>
                              Round {getRoundNumber(round)}: {safeUpper(getRoundType(round), 'TECHNICAL')}
                            </strong>
                            <p style={detailSubStyle}>
                              {formatDateTime(getRoundScheduledAt(round))} · {safeString(round.mode, 'video')} · {getRoundDuration(round)}m
                            </p>
                          </div>

                          <div style={roundActionStyle}>
                            <span
                              style={{
                                ...statusPillStyle,
                                color: status.color,
                                borderColor: `${status.color}55`,
                                background: `${status.color}14`,
                              }}
                            >
                              {status.label}
                            </span>

                            {joinable && (
                              <button type="button" onClick={() => joinRound(round)} style={smallButtonStyle}>
                                Join
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => router.push(`/recruiter/interviews/${selectedInterview.id}/feedback?roundId=${round.id}`)}
                              style={smallButtonStyle}
                            >
                              Feedback
                            </button>

                            <select
                              defaultValue=""
                              onChange={(event) => {
                                const value = event.target.value as RoundResult;
                                if (value) void submitRoundResult(round.id, value);
                                event.target.value = '';
                              }}
                              style={smallSelectStyle}
                            >
                              <option value="">Result</option>
                              {ROUND_RESULTS.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div style={emptyStateStyle}>
                    No rounds scheduled yet. Click Schedule Round to create first round.
                  </div>
                )}
              </section>

              <section style={{ marginTop: 18 }}>
                <p style={sectionTitleStyle}>Activity Timeline</p>

                {events.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {events.slice(0, 10).map((event) => (
                      <div key={event.id} style={eventCardStyle}>
                        <span>{formatEvent(event)}</span>
                        <strong>{formatDateTime(event.created_at ?? event.createdAt)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={emptyStateStyle}>No interview events yet.</div>
                )}
              </section>
            </>
          )}
        </section>
      </section>

      <ScheduleModal
        open={scheduleOpen}
        title={scheduleTitle}
        busy={scheduleBusy}
        onClose={() => setScheduleOpen(false)}
        onSubmit={(payload) => void scheduleRound(payload)}
      />
    </main>
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
    <div style={{ ...statCardStyle, borderColor: `${color}33`, background: `${color}10` }}>
      <p>{label}</p>
      <strong style={{ color }}>{value}</strong>
    </div>
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
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 950,
  letterSpacing: '-0.05em',
};

const subtitleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: C.muted,
  fontSize: 14,
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
  marginBottom: 18,
};

const statCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: '1rem',
};

const workspaceStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '360px 1fr',
  gap: 16,
};

const listPanelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 18,
  overflow: 'hidden',
};

const detailPanelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 18,
  padding: '1.1rem',
  minHeight: 420,
};

const panelHeaderStyle: CSSProperties = {
  padding: '1rem',
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  justifyContent: 'space-between',
};

const scrollListStyle: CSSProperties = {
  maxHeight: 650,
  overflowY: 'auto',
  display: 'grid',
};

const interviewRowStyle: CSSProperties = {
  border: 'none',
  borderBottom: `1px solid ${C.border}`,
  padding: '1rem',
  textAlign: 'left',
  cursor: 'pointer',
  color: C.text,
  fontFamily: "'Sora', sans-serif",
  display: 'grid',
  gap: 5,
};

const rowTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
};

const rowSubStyle: CSSProperties = {
  fontSize: 12,
  color: C.muted,
};

const stageBadgeStyle: CSSProperties = {
  marginTop: 4,
  width: 'fit-content',
  color: C.purple,
  background: 'rgba(167,139,250,0.12)',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 950,
  textTransform: 'uppercase',
};

const detailHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 16,
};

const detailTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 950,
};

const detailSubStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.muted,
  fontSize: 12,
};

const detailActionRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  color: C.faint,
  fontSize: 12,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const nextRoundStyle: CSSProperties = {
  marginTop: 16,
  padding: '1rem',
  borderRadius: 16,
  border: '1px solid rgba(56,189,248,0.25)',
  background: 'rgba(56,189,248,0.07)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
};

const roundCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 14,
  padding: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
};

const roundActionStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

const eventCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 14,
  padding: '0.85rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  color: C.muted,
  fontSize: 12,
};

const statusPillStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 10,
  fontWeight: 950,
  textTransform: 'uppercase',
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 12,
  padding: '11px 12px',
  color: C.text,
  outline: 'none',
  fontFamily: "'Sora', sans-serif",
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  minWidth: 230,
};

const smallSelectStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 10,
  padding: '7px 9px',
  color: C.text,
  fontSize: 12,
};

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 14,
  padding: '11px 16px',
  color: '#020617',
  fontWeight: 950,
  cursor: 'pointer',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.red})`,
  fontFamily: "'Sora', sans-serif",
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '11px 16px',
  color: C.text,
  fontWeight: 850,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
  fontFamily: "'Sora', sans-serif",
};

const smallButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: '7px 10px',
  color: C.text,
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)',
  fontSize: 12,
  fontWeight: 850,
};

const joinButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '8px 12px',
  color: '#001018',
  cursor: 'pointer',
  background: C.green,
  fontSize: 12,
  fontWeight: 950,
};

const errorBoxStyle: CSSProperties = {
  border: '1px solid rgba(248,113,113,0.28)',
  background: 'rgba(248,113,113,0.08)',
  color: '#FCA5A5',
  borderRadius: 16,
  padding: '12px 14px',
  marginBottom: 16,
  fontSize: 13,
  fontWeight: 850,
};

const emptyStateStyle: CSSProperties = {
  color: C.faint,
  fontSize: 13,
  padding: '1rem',
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0,0,0,0.72)',
  display: 'grid',
  placeItems: 'center',
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: 'min(540px, 100%)',
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 22,
  padding: '1.3rem',
};

const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
};

const eyebrowStyle: CSSProperties = {
  margin: '0 0 6px',
  color: C.purple,
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 20,
  fontWeight: 950,
};

const closeButtonStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.panel2,
  color: C.text,
  cursor: 'pointer',
  fontSize: 18,
};

const formGridStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  marginTop: 18,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const labelStyle: CSSProperties = {
  color: C.faint,
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

const roundTypeWrapStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const roundTypeButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.04)',
  color: C.muted,
  borderRadius: 999,
  padding: '7px 12px',
  cursor: 'pointer',
  fontWeight: 850,
};

const activeRoundTypeButtonStyle: CSSProperties = {
  borderColor: 'rgba(167,139,250,0.45)',
  background: 'rgba(167,139,250,0.14)',
  color: C.purple,
};

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const modalFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 18,
};

const errorTextStyle: CSSProperties = {
  color: C.red,
  fontSize: 12,
  fontWeight: 800,
};