'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/interviews/page.tsx

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

import api from '@/lib/axios';

type InterviewStage =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_PASSED'
  | 'INTERVIEW_FAILED'
  | 'FINAL_REVIEW'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'WITHDRAWN'
  | string;

interface InterviewItem {
  id: string;
  current_stage?: InterviewStage | null;
  currentStage?: InterviewStage | null;
  status_code?: number | null;
  statusCode?: number | null;
  final_status?: string | null;
  finalStatus?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  job_title?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  company_name?: string | null;
  companyName?: string | null;
}

interface Round {
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
}

interface FeedbackData {
  id: string;
  round_id?: string | null;
  roundId?: string | null;
  technical_score?: number | null;
  technicalScore?: number | null;
  communication_score?: number | null;
  communicationScore?: number | null;
  problem_solving_score?: number | null;
  problemSolvingScore?: number | null;
  culture_fit_score?: number | null;
  cultureFitScore?: number | null;
  overall_score?: number | null;
  overallScore?: number | null;
  recommendation?: string | null;
  strengths?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

interface InterviewEvent {
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
}

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
  border: 'rgba(255,255,255,0.08)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.36)',
  purple: '#A78BFA',
  sky: '#38BDF8',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
  gray: '#9CA3AF',
};

const STAGE_META: Record<string, { label: string; color: string; icon: string; step: number }> = {
  APPLIED: { label: 'Application Received', color: '#60A5FA', icon: '📋', step: 1 },
  UNDER_REVIEW: { label: 'Under Review', color: '#FBBF24', icon: '🔍', step: 2 },
  SHORTLISTED: { label: 'Shortlisted', color: '#38BDF8', icon: '⭐', step: 3 },
  INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', color: '#A78BFA', icon: '📅', step: 4 },
  INTERVIEW_IN_PROGRESS: { label: 'Interview In Progress', color: '#FB923C', icon: '🎥', step: 5 },
  INTERVIEW_PASSED: { label: 'Passed', color: '#34D399', icon: '✅', step: 6 },
  INTERVIEW_FAILED: { label: 'Not Selected', color: '#9CA3AF', icon: '📋', step: 6 },
  FINAL_REVIEW: { label: 'Final Review', color: '#C084FC', icon: '🎯', step: 7 },
  OFFERED: { label: 'Offer Extended', color: '#4ADE80', icon: '💌', step: 8 },
  HIRED: { label: 'Hired', color: '#10B981', icon: '🎉', step: 9 },
  REJECTED: { label: 'Not Selected', color: '#6B7280', icon: '📋', step: 0 },
  ON_HOLD: { label: 'On Hold', color: '#D97706', icon: '⏸', step: 0 },
  WITHDRAWN: { label: 'Withdrawn', color: '#6B7280', icon: '↩', step: 0 },
};

const PROGRESS_STEPS = [
  { key: 'applied', label: 'Applied' },
  { key: 'review', label: 'Review' },
  { key: 'shortlist', label: 'Shortlisted' },
  { key: 'scheduled', label: 'Interview' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'decision', label: 'Decision' },
];

function safeString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toArray<T>(raw: unknown, key?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  const keys = ['data', 'items', 'results', 'interviews', 'rounds', 'feedback', 'events', key].filter(
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
      if (Array.isArray(nested.interviews)) return nested.interviews as T[];
      if (Array.isArray(nested.rounds)) return nested.rounds as T[];
      if (Array.isArray(nested.feedback)) return nested.feedback as T[];
      if (Array.isArray(nested.events)) return nested.events as T[];
    }
  }

  return [];
}

function getErrorMessage(error: unknown, fallback: string) {
  const anyError = error as any;

  return safeString(
    anyError?.response?.data?.detail ??
      anyError?.response?.data?.message ??
      anyError?.response?.data?.error ??
      anyError?.message,
    fallback,
  );
}

function normalizeStage(stage?: string | null) {
  return safeString(stage, 'APPLIED')
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function getStage(item: InterviewItem) {
  return normalizeStage(item.current_stage ?? item.currentStage ?? item.final_status ?? item.finalStatus);
}

function getStageMeta(stage: string) {
  return STAGE_META[stage] ?? STAGE_META.APPLIED;
}

function getCreatedAt(item: InterviewItem) {
  return item.created_at ?? item.createdAt ?? null;
}

function getUpdatedAt(item: InterviewItem) {
  return item.updated_at ?? item.updatedAt ?? null;
}

function getJobTitle(item: InterviewItem) {
  return safeString(item.job_title ?? item.jobTitle, 'Position');
}

function getCompany(item: InterviewItem) {
  return safeString(item.companyName ?? item.company_name ?? item.company, 'Company');
}

function getRoundNumber(round: Round) {
  return safeNumber(round.round_number ?? round.roundNumber, 1);
}

function getRoundType(round: Round) {
  return safeString(round.round_type ?? round.roundType, 'technical');
}

function getRoundScheduledAt(round: Round) {
  return round.scheduled_at ?? round.scheduledAt ?? null;
}

function getRoundDuration(round: Round) {
  return safeNumber(round.duration_mins ?? round.durationMins, 45);
}

function getJoinUrl(round: Round) {
  return safeString(round.meeting_join_url ?? round.meetingJoinUrl ?? round.joinUrl, '');
}

function getSafeRoomPath(interviewId: string, round: Round) {
  const rawJoinUrl = getJoinUrl(round);

  if (rawJoinUrl && !rawJoinUrl.includes('localhost')) {
    try {
      const parsed = new URL(rawJoinUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      if (rawJoinUrl.startsWith('/')) return rawJoinUrl;
    }
  }

  return `/interviews/room/jc-${interviewId}-r${getRoundNumber(round)}`;
}

function getUpcomingRound(rounds: Round[]) {
  const now = Date.now() - 60 * 60 * 1000;

  return rounds
    .filter((round) => {
      const scheduledAt = getRoundScheduledAt(round);
      if (!scheduledAt) return false;

      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) return false;

      return date.getTime() >= now && !safeString(round.result).toLowerCase().includes('complete');
    })
    .sort((a, b) => {
      const aTime = new Date(getRoundScheduledAt(a) ?? '').getTime();
      const bTime = new Date(getRoundScheduledAt(b) ?? '').getTime();
      return aTime - bTime;
    })[0];
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
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

function getFeedbackRoundId(feedback: FeedbackData) {
  return safeString(feedback.round_id ?? feedback.roundId, '');
}

function getFeedbackScore(feedback: FeedbackData, key: keyof FeedbackData, alt: keyof FeedbackData) {
  return safeNumber(feedback[key] ?? feedback[alt], 0);
}

function getFeedbackCreatedAt(feedback: FeedbackData) {
  return feedback.created_at ?? feedback.createdAt ?? null;
}

function ProgressBar({ stage }: { stage: string }) {
  const meta = getStageMeta(stage);
  const step = meta.step;
  const isTerminal = ['REJECTED', 'WITHDRAWN'].includes(stage);

  return (
    <div style={progressWrapStyle}>
      {PROGRESS_STEPS.map((item, index) => {
        const done = step > index + 1;
        const active = step === index + 1;
        const color = isTerminal ? C.gray : done || active ? C.purple : 'rgba(255,255,255,0.12)';

        return (
          <div key={item.key} style={progressItemStyle}>
            <div style={progressDotWrapStyle}>
              <div
                style={{
                  ...progressDotStyle,
                  background: done ? C.purple : active ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: color,
                  color,
                }}
              >
                {done ? '✓' : index + 1}
              </div>
              <span style={{ ...progressLabelStyle, color: active ? C.purple : C.faint }}>{item.label}</span>
            </div>

            {index < PROGRESS_STEPS.length - 1 && (
              <div style={{ ...progressLineStyle, background: done ? C.purple : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: FeedbackData }) {
  const technical = getFeedbackScore(feedback, 'technical_score', 'technicalScore');
  const communication = getFeedbackScore(feedback, 'communication_score', 'communicationScore');
  const problem = getFeedbackScore(feedback, 'problem_solving_score', 'problemSolvingScore');
  const culture = getFeedbackScore(feedback, 'culture_fit_score', 'cultureFitScore');
  const overall = getFeedbackScore(feedback, 'overall_score', 'overallScore');

  const rows = [
    { label: 'Technical', score: technical },
    { label: 'Communication', score: communication },
    { label: 'Problem Solving', score: problem },
    { label: 'Culture Fit', score: culture },
  ];

  return (
    <div style={feedbackBoxStyle}>
      <div style={feedbackHeaderStyle}>
        <div>
          <p style={feedbackTitleStyle}>Interview Feedback</p>
          <p style={tinyTextStyle}>{formatDate(getFeedbackCreatedAt(feedback))}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <strong style={{ color: overall >= 70 ? C.green : overall >= 50 ? C.yellow : C.red, fontSize: 22 }}>
            {Math.round(overall)}
          </strong>
          <p style={tinyTextStyle}>/100</p>
        </div>
      </div>

      <div style={feedbackGridStyle}>
        {rows.map((row) => {
          const percent = Math.max(0, Math.min(100, (row.score / 5) * 100));
          const color = row.score >= 4 ? C.green : row.score >= 3 ? C.yellow : C.red;

          return (
            <div key={row.label}>
              <div style={scoreLabelStyle}>
                <span>{row.label}</span>
                <strong style={{ color }}>{row.score}/5</strong>
              </div>
              <div style={scoreTrackStyle}>
                <div style={{ ...scoreFillStyle, width: `${percent}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {feedback.strengths && (
        <div style={strengthBoxStyle}>
          <strong>Strengths</strong>
          <p>{feedback.strengths}</p>
        </div>
      )}
    </div>
  );
}

function InterviewCard({ item }: { item: InterviewItem }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const stage = getStage(item);
  const meta = getStageMeta(stage);
  const isTerminal = ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(stage);
  const upcomingRound = useMemo(() => getUpcomingRound(rounds), [rounds]);

  const loadDetails = useCallback(async () => {
    if (rounds.length > 0 || loading) return;

    setLoading(true);

    try {
      const [detailRes, feedbackRes] = await Promise.allSettled([
        api.get(`/candidate/interviews/${item.id}`),
        api.get(`/feedback/interviews/${item.id}`),
      ]);

      if (detailRes.status === 'fulfilled') {
        const payload = detailRes.value.data;
        setRounds(toArray<Round>(payload, 'rounds'));
        setEvents(toArray<InterviewEvent>(payload, 'events'));
      }

      if (feedbackRes.status === 'fulfilled') {
        setFeedback(toArray<FeedbackData>(feedbackRes.value.data, 'feedback'));
      }
    } finally {
      setLoading(false);
    }
  }, [item.id, loading, rounds.length]);

  const handleExpand = () => {
    if (!expanded) void loadDetails();
    setExpanded((current) => !current);
  };

  const handleJoin = (round: Round) => {
    router.push(getSafeRoomPath(item.id, round));
  };

  return (
    <article style={{ ...cardStyle, borderColor: `${meta.color}28`, background: `${meta.color}06` }}>
      <button type="button" onClick={handleExpand} style={cardButtonStyle}>
        <div style={{ ...iconBoxStyle, background: `${meta.color}18`, borderColor: `${meta.color}30` }}>
          {meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={cardTitleRowStyle}>
            <h3 style={cardTitleStyle}>{getJobTitle(item)}</h3>
            <span style={{ ...pillStyle, color: meta.color, borderColor: `${meta.color}35`, background: `${meta.color}12` }}>
              {meta.label}
            </span>
          </div>

          <p style={mutedTextStyle}>
            {getCompany(item)} · Applied {formatDate(getCreatedAt(item))}
          </p>

          {!isTerminal && <ProgressBar stage={stage} />}

          {stage === 'HIRED' && (
            <div style={successBannerStyle}>
              <span>🎉</span>
              <strong>Congratulations! You have been hired.</strong>
            </div>
          )}

          {stage === 'REJECTED' && (
            <div style={neutralBannerStyle}>
              Thank you for applying. Keep improving — the right opportunity is ahead.
            </div>
          )}
        </div>

        <span style={expandIconStyle}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={expandedStyle}>
          {loading ? (
            <p style={mutedTextStyle}>Loading interview details...</p>
          ) : (
            <>
              {upcomingRound && (
                <section style={upcomingBoxStyle}>
                  <p style={upcomingTitleStyle}>Upcoming Interview</p>
                  <p style={mutedTextStyle}>
                    {getRoundType(upcomingRound).toUpperCase()} · Round {getRoundNumber(upcomingRound)} ·{' '}
                    {formatDateTime(getRoundScheduledAt(upcomingRound))} · {getRoundDuration(upcomingRound)} min ·{' '}
                    {safeString(upcomingRound.mode, 'video')}
                  </p>

                  <button type="button" onClick={() => handleJoin(upcomingRound)} style={joinButtonStyle}>
                    Join Interview Room
                  </button>
                </section>
              )}

              {rounds.length > 0 ? (
                <section style={{ marginTop: 14 }}>
                  <p style={sectionTinyTitleStyle}>Interview Rounds</p>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {rounds.map((round) => {
                      const roundFeedback = feedback.find((item) => getFeedbackRoundId(item) === round.id);
                      const scheduledAt = getRoundScheduledAt(round);

                      return (
                        <div key={round.id}>
                          <div style={roundRowStyle}>
                            <div>
                              <strong>
                                Round {getRoundNumber(round)}: {getRoundType(round).toUpperCase()}
                              </strong>
                              <p style={tinyTextStyle}>{scheduledAt ? formatDateTime(scheduledAt) : 'Not scheduled'}</p>
                            </div>

                            <span style={smallPillStyle}>{safeString(round.result, 'Scheduled')}</span>
                          </div>

                          {roundFeedback && <FeedbackCard feedback={roundFeedback} />}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <p style={mutedTextStyle}>
                  No rounds scheduled yet. You will receive an alert when the recruiter schedules your interview.
                </p>
              )}

              {events.length > 0 && (
                <section style={{ marginTop: 14 }}>
                  <p style={sectionTinyTitleStyle}>Timeline</p>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {events.slice(0, 8).map((event) => (
                      <div key={event.id} style={eventRowStyle}>
                        <p>{formatEvent(event)}</p>
                        <span>{formatDateTime(event.created_at ?? event.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function CandidateInterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get('/candidate/interviews', {
        params: { limit: 100 },
      });

      setInterviews(toArray<InterviewItem>(res.data, 'interviews'));
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load interviews.'));
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [load]);

  const displayed = useMemo(() => {
    if (filter === 'all') return interviews;

    return interviews.filter((item) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(getStage(item)));
  }, [filter, interviews]);

  const stats = useMemo(() => {
    const active = interviews.filter((item) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(getStage(item))).length;
    const upcoming = interviews.filter((item) =>
      ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS'].includes(getStage(item)),
    ).length;
    const hired = interviews.filter((item) => getStage(item) === 'HIRED').length;

    return {
      total: interviews.length,
      active,
      upcoming,
      hired,
    };
  }, [interviews]);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>My Interviews</h1>
        <p style={subtitleStyle}>Track every application through the hiring process.</p>
      </header>

      <section style={statsGridStyle}>
        <StatCard label="Total Applied" value={stats.total} color={C.purple} icon="📋" />
        <StatCard label="Active" value={stats.active} color={C.sky} icon="⚡" />
        <StatCard label="Upcoming" value={stats.upcoming} color={C.yellow} icon="📅" />
        <StatCard label="Hired" value={stats.hired} color={C.green} icon="🎉" />
      </section>

      <section style={filterRowStyle}>
        <button
          type="button"
          onClick={() => setFilter('active')}
          style={{ ...filterButtonStyle, ...(filter === 'active' ? activeFilterStyle : {}) }}
        >
          Active ({stats.active})
        </button>

        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{ ...filterButtonStyle, ...(filter === 'all' ? activeFilterStyle : {}) }}
        >
          All ({stats.total})
        </button>

        <button type="button" onClick={() => void load()} style={refreshButtonStyle}>
          Refresh
        </button>
      </section>

      {error && <div style={errorBoxStyle}>{error}</div>}

      {loading ? (
        <section style={listStyle}>
          {[1, 2, 3].map((item) => (
            <div key={item} style={skeletonStyle} />
          ))}
        </section>
      ) : displayed.length > 0 ? (
        <section style={listStyle}>
          {displayed.map((item) => (
            <InterviewCard key={item.id} item={item} />
          ))}
        </section>
      ) : (
        <section style={emptyStyle}>
          <div>📋</div>
          <strong>{filter === 'active' ? 'No active interviews' : 'No interviews yet'}</strong>
          <p>
            {filter === 'active'
              ? 'Check All to see your full interview history.'
              : 'Apply to jobs to start your interview journey.'}
          </p>
        </section>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div style={{ ...statCardStyle, borderColor: `${color}22` }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <strong style={{ color }}>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}

function formatEvent(event: InterviewEvent) {
  const type = safeString(event.event_type ?? event.eventType);
  const fromStage = safeString(event.from_stage ?? event.fromStage, 'unknown');
  const toStage = safeString(event.to_stage ?? event.toStage, 'unknown');

  if (type === 'stage_changed' || type === 'STATUS_CHANGED') {
    return `Status moved from ${fromStage} to ${toStage}`;
  }

  if (type === 'round_scheduled') return 'A new interview round was scheduled.';
  if (type === 'ROUND_COMPLETED' || type === 'round_result_submitted') return 'A round result was submitted.';
  if (type === 'room_started') return 'Interview room was started.';
  if (type === 'room_ended') return 'Interview room was ended.';

  return type.replaceAll('_', ' ') || 'Interview updated.';
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: C.bg,
  color: C.text,
  fontFamily: "'Sora', sans-serif",
};

const headerStyle: CSSProperties = {
  background: C.panel,
  borderBottom: `1px solid ${C.border}`,
  padding: '1.25rem 2rem',
};

const titleStyle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: 22,
  fontWeight: 950,
  letterSpacing: '-0.04em',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: C.faint,
  fontSize: 13,
};

const statsGridStyle: CSSProperties = {
  maxWidth: 980,
  margin: '1.5rem auto',
  padding: '0 1.5rem',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 12,
};

const statCardStyle: CSSProperties = {
  padding: '1rem',
  borderRadius: 14,
  background: C.panel,
  border: `1px solid ${C.border}`,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const filterRowStyle: CSSProperties = {
  maxWidth: 980,
  margin: '0 auto 1rem',
  padding: '0 1.5rem',
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const filterButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.03)',
  color: C.muted,
  cursor: 'pointer',
  fontWeight: 800,
  fontFamily: "'Sora', sans-serif",
};

const activeFilterStyle: CSSProperties = {
  background: 'rgba(124,58,237,0.16)',
  borderColor: 'rgba(124,58,237,0.40)',
  color: C.purple,
};

const refreshButtonStyle: CSSProperties = {
  ...filterButtonStyle,
  marginLeft: 'auto',
};

const listStyle: CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
  padding: '0 1.5rem 4rem',
  display: 'grid',
  gap: 12,
};

const cardStyle: CSSProperties = {
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  background: C.panel,
  overflow: 'hidden',
};

const cardButtonStyle: CSSProperties = {
  width: '100%',
  padding: '1rem 1.25rem',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
  textAlign: 'left',
  fontFamily: "'Sora', sans-serif",
};

const iconBoxStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  display: 'grid',
  placeItems: 'center',
  fontSize: 20,
  flexShrink: 0,
};

const cardTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 900,
  color: C.text,
};

const pillStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  padding: '4px 8px',
  borderRadius: 999,
  border: `1px solid ${C.border}`,
};

const mutedTextStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.faint,
  fontSize: 12,
};

const tinyTextStyle: CSSProperties = {
  margin: 0,
  color: C.faint,
  fontSize: 11,
};

const expandIconStyle: CSSProperties = {
  color: C.faint,
  fontSize: 13,
  marginTop: 2,
};

const progressWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  marginTop: 12,
};

const progressItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
};

const progressDotWrapStyle: CSSProperties = {
  textAlign: 'center',
  flex: '0 0 auto',
};

const progressDotStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: '2px solid',
  display: 'grid',
  placeItems: 'center',
  fontSize: 10,
  fontWeight: 900,
};

const progressLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 9,
  whiteSpace: 'nowrap',
  marginTop: 4,
};

const progressLineStyle: CSSProperties = {
  flex: 1,
  height: 2,
  margin: '0 2px 14px',
};

const successBannerStyle: CSSProperties = {
  marginTop: 10,
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(16,185,129,0.12)',
  border: '1px solid rgba(16,185,129,0.30)',
  color: C.green,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  fontSize: 12,
};

const neutralBannerStyle: CSSProperties = {
  marginTop: 10,
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(107,114,128,0.10)',
  border: '1px solid rgba(107,114,128,0.20)',
  color: C.gray,
  fontSize: 12,
};

const expandedStyle: CSSProperties = {
  padding: '0 1.25rem 1.25rem',
  borderTop: `1px solid ${C.border}`,
};

const upcomingBoxStyle: CSSProperties = {
  margin: '12px 0',
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(56,189,248,0.08)',
  border: '1px solid rgba(56,189,248,0.20)',
};

const upcomingTitleStyle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: 11,
  fontWeight: 900,
  color: C.sky,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const joinButtonStyle: CSSProperties = {
  marginTop: 10,
  padding: '10px 18px',
  borderRadius: 10,
  border: 'none',
  background: C.sky,
  color: '#001018',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const sectionTinyTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  color: C.faint,
  fontSize: 11,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const roundRowStyle: CSSProperties = {
  padding: '11px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.025)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  color: C.text,
  fontSize: 12,
};

const smallPillStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  padding: '4px 8px',
  borderRadius: 999,
  color: C.yellow,
  background: 'rgba(251,191,36,0.10)',
};

const feedbackBoxStyle: CSSProperties = {
  padding: '1rem',
  borderRadius: 12,
  border: '1px solid rgba(167,139,250,0.20)',
  background: 'rgba(124,58,237,0.05)',
  marginTop: 8,
};

const feedbackHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 12,
};

const feedbackTitleStyle: CSSProperties = {
  margin: 0,
  color: C.purple,
  fontSize: 12,
  fontWeight: 900,
};

const feedbackGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
};

const scoreLabelStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 11,
  color: C.faint,
  marginBottom: 4,
};

const scoreTrackStyle: CSSProperties = {
  height: 5,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.07)',
  overflow: 'hidden',
};

const scoreFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 999,
};

const strengthBoxStyle: CSSProperties = {
  marginTop: 10,
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(52,211,153,0.07)',
  border: '1px solid rgba(52,211,153,0.18)',
  color: C.green,
  fontSize: 12,
};

const eventRowStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: 'rgba(255,255,255,0.025)',
  color: C.text,
  fontSize: 12,
};

const errorBoxStyle: CSSProperties = {
  maxWidth: 980,
  margin: '0 auto 1rem',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(248,113,113,0.25)',
  background: 'rgba(248,113,113,0.07)',
  color: '#FCA5A5',
  fontSize: 13,
  fontWeight: 800,
};

const skeletonStyle: CSSProperties = {
  height: 110,
  borderRadius: 16,
  background: 'rgba(255,255,255,0.045)',
};

const emptyStyle: CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
  padding: '5rem 1.5rem',
  textAlign: 'center',
  color: C.faint,
};