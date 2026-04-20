'use client';

// frontend/app/(protected)/interviews/page.tsx
//
// Candidate-facing interview lifecycle page.
//
// Shows the full journey:
//   Applied → Shortlisted → Scheduled → In Progress → Result
//
// Key sections:
//   1. Stats row — pending / upcoming / completed
//   2. Upcoming interviews banner (next scheduled round with join button)
//   3. All interviews list with expandable detail
//   4. Feedback viewer (once recruiter submits)

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { interviewApi, feedbackApi } from '@/lib/axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InterviewItem {
  id:            string;
  current_stage: string;
  status_code:   number;
  final_status:  string | null;
  created_at:    string;
  updated_at:    string;
  job_title?:    string;
  company?:      string;
}

interface Round {
  id:               string;
  round_number:     number;
  round_type:       string;
  scheduled_at:     string | null;
  duration_mins:    number | null;
  mode:             string | null;
  meeting_join_url: string | null;
  result:           string | null;
  score:            number | null;
}

interface FeedbackData {
  id:                    string;
  round_id:              string;
  technical_score:       number;
  communication_score:   number;
  problem_solving_score: number;
  culture_fit_score:     number;
  overall_score:         number;
  recommendation:        string;
  strengths?:            string;
  created_at:            string;
}

interface InterviewEvent {
  id: string;
  event_type: string;
  from_stage?: string | null;
  to_stage?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage metadata
// ─────────────────────────────────────────────────────────────────────────────

const STAGE = {
  APPLIED:               { label: 'Application Received',  color: '#60A5FA', icon: '📋', step: 1 },
  UNDER_REVIEW:          { label: 'Under Review',          color: '#FBBF24', icon: '🔍', step: 2 },
  SHORTLISTED:           { label: 'Shortlisted',           color: '#38BDF8', icon: '⭐', step: 3 },
  INTERVIEW_SCHEDULED:   { label: 'Interview Scheduled',   color: '#A78BFA', icon: '📅', step: 4 },
  INTERVIEW_IN_PROGRESS: { label: 'Interview In Progress', color: '#FB923C', icon: '🎥', step: 5 },
  INTERVIEW_PASSED:      { label: 'Passed',                color: '#34D399', icon: '✅', step: 6 },
  INTERVIEW_FAILED:      { label: 'Not Selected',          color: '#9CA3AF', icon: '📋', step: 6 },
  FINAL_REVIEW:          { label: 'Final Review',          color: '#C084FC', icon: '🎯', step: 7 },
  OFFERED:               { label: 'Offer Extended',        color: '#4ADE80', icon: '💌', step: 8 },
  HIRED:                 { label: 'Hired! 🎉',             color: '#10B981', icon: '🎉', step: 9 },
  REJECTED:              { label: 'Not Selected',          color: '#6B7280', icon: '📋', step: 0 },
  ON_HOLD:               { label: 'On Hold',               color: '#D97706', icon: '⏸', step: 0 },
  WITHDRAWN:             { label: 'Withdrawn',             color: '#6B7280', icon: '↩', step: 0 },
} as const;

// Candidate-visible progress steps
const PROGRESS_STEPS = [
  { key: 'applied',     label: 'Applied'    },
  { key: 'review',      label: 'Review'     },
  { key: 'shortlist',   label: 'Shortlisted'},
  { key: 'scheduled',   label: 'Interview'  },
  { key: 'evaluation',  label: 'Evaluation' },
  { key: 'decision',    label: 'Decision'   },
];

function getProgressStep(stage: string): number {
  const meta = STAGE[stage as keyof typeof STAGE];
  return meta?.step ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────

function ProgressBar({ stage }: { stage: string }) {
  const step = getProgressStep(stage);
  const isTerminal = ['REJECTED', 'WITHDRAWN'].includes(stage);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 10 }}>
      {PROGRESS_STEPS.map((s, i) => {
        const done = step > i + 1;
        const active = step === i + 1;
        const color = isTerminal ? '#6B7280' : done || active ? '#A78BFA' : 'rgba(255,255,255,0.1)';
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', margin: '0 auto 4px',
                background: done ? '#A78BFA' : active ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, color: active ? '#A78BFA' : 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#A78BFA' : 'rgba(255,255,255,0.08)', margin: '0 2px 14px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackCard (candidate view — sanitized)
// ─────────────────────────────────────────────────────────────────────────────

function FeedbackCard({ feedback }: { feedback: FeedbackData }) {
  const dim = (score: number) => {
    const pct = (score / 5) * 100;
    const color = score >= 4 ? '#34D399' : score >= 3 ? '#FBBF24' : '#F87171';
    return { pct, color };
  };

  const dims = [
    { label: 'Technical', score: feedback.technical_score, icon: '💻' },
    { label: 'Communication', score: feedback.communication_score, icon: '🗣️' },
    { label: 'Problem Solving', score: feedback.problem_solving_score, icon: '🧠' },
    { label: 'Culture Fit', score: feedback.culture_fit_score, icon: '🤝' },
  ];

  const recColor = feedback.recommendation === 'HIRE' ? '#10B981' : feedback.recommendation === 'REJECT' ? '#F87171' : '#FBBF24';

  return (
    <div style={{
      padding: '1rem 1.25rem', borderRadius: 10,
      border: '1px solid rgba(167,139,250,0.2)',
      background: 'rgba(124,58,237,0.04)',
      marginTop: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#A78BFA' }}>Interview Feedback</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {new Date(feedback.created_at).toLocaleDateString()}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: recColor === '#10B981' ? '#34D399' : recColor === '#F87171' ? '#F87171' : '#FBBF24', fontFamily: 'monospace' }}>
            {feedback.overall_score.toFixed(0)}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>/ 100</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
        {dims.map(d => {
          const { pct, color } = dim(d.score);
          return (
            <div key={d.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{d.icon} {d.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'monospace' }}>{d.score}/5</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {feedback.strengths && (
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', marginBottom: 8 }}>
          <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Strengths</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{feedback.strengths}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InterviewCard
// ─────────────────────────────────────────────────────────────────────────────

function InterviewCard({ item }: { item: InterviewItem }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [rounds,   setRounds]   = useState<Round[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [events,   setEvents]   = useState<InterviewEvent[]>([]);
  const [loading,  setLoading]  = useState(false);

  const meta = STAGE[item.current_stage as keyof typeof STAGE] ?? STAGE.APPLIED;
  const isTerminal = ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(item.current_stage);
  const isPositive = ['HIRED', 'OFFERED', 'INTERVIEW_PASSED', 'FINAL_REVIEW', 'SHORTLISTED'].includes(item.current_stage);

  const loadDetail = async () => {
    if (rounds.length > 0) return; // already loaded
    setLoading(true);
    try {
      const [detailRes, feedbackRes] = await Promise.allSettled([
        interviewApi.getCandidateInterview(item.id),
        feedbackApi.getByInterview(item.id),
      ]);
      if (detailRes.status === 'fulfilled') {
        setRounds((detailRes.value.data?.rounds ?? []) as Round[]);
        setEvents((detailRes.value.data?.events ?? []) as InterviewEvent[]);
      }
      if (feedbackRes.status === 'fulfilled') {
        const data = feedbackRes.value.data;
        setFeedback(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter(r => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [rounds]);

  const handleExpand = () => {
    if (!expanded) void loadDetail();
    setExpanded(p => !p);
  };

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${isPositive ? `${meta.color}25` : 'rgba(255,255,255,0.08)'}`,
      background: isPositive ? `${meta.color}05` : '#0D1220',
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div
        onClick={handleExpand}
        style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
      >
        {/* Company initial */}
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>
              {item.job_title ?? 'Position'}
            </h3>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
            }}>
              {meta.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {item.company ?? 'Company'} · Applied {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>

          {/* Progress bar */}
          {!isTerminal && <ProgressBar stage={item.current_stage} />}

          {/* Hired/Rejected banner */}
          {item.current_stage === 'HIRED' && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎉</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>Congratulations! You&apos;ve been hired!</span>
            </div>
          )}
          {item.current_stage === 'REJECTED' && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                Thank you for your interest. Keep applying — the right opportunity is out there.
              </p>
            </div>
          )}
        </div>

        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {loading ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '12px 0' }}>Loading details…</p>
          ) : (
            <>
              {/* Next round join button */}
              {nextRound && (
                <div style={{
                  margin: '12px 0', padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#38BDF8' }}>
                    📅 Upcoming Interview
                  </p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    {nextRound.round_type.toUpperCase()} · Round {nextRound.round_number} ·{' '}
                    {new Date(nextRound.scheduled_at!).toLocaleString()} ·{' '}
                    {nextRound.duration_mins}min · {nextRound.mode ?? 'video'}
                  </p>
                  <button
                    onClick={() => {
                      const roomId = `jc-${item.id}-r${nextRound.round_number}`;
                      router.push(`/interviews/room/${roomId}`);
                    }}
                    style={{
                      padding: '9px 20px', borderRadius: 8, border: 'none',
                      background: '#38BDF8', color: '#001018',
                      fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    🎥 Join Interview Room
                  </button>
                </div>
              )}

              {/* All rounds */}
              {rounds.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Interview Rounds
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rounds.map(r => {
                      const roundFeedback = feedback.find(f => f.round_id === r.id);
                      return (
                        <div key={r.id}>
                          <div style={{
                            padding: '10px 12px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.07)',
                            background: 'rgba(255,255,255,0.02)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>
                                  Round {r.round_number}: {r.round_type.toUpperCase()}
                                </span>
                                <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                  {r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString() : 'Not scheduled'}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                                color:      r.result === 'pass' ? '#34D399' : r.result === 'fail' ? '#F87171' : '#FBBF24',
                                background: r.result === 'pass' ? 'rgba(52,211,153,0.1)' : r.result === 'fail' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                              }}>
                                {r.result ?? 'Scheduled'}
                              </span>
                            </div>
                          </div>
                          {roundFeedback && <FeedbackCard feedback={roundFeedback} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {rounds.length === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', paddingTop: 12, margin: 0 }}>
                  No rounds scheduled yet. You&apos;ll receive an email when the recruiter schedules your interview.
                </p>
              )}

              {events.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Timeline
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {events.slice(0, 8).map((event) => (
                      <div key={event.id} style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.02)',
                      }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#F1F5F9' }}>
                          {formatEvent(event)}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateInterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState<'active' | 'all'>('active');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await interviewApi.listCandidateInterviews({ limit: 100 });
        setInterviews((res.data ?? []) as InterviewItem[]);
        setError('');
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Failed to load interviews'));
      } finally {
        setLoading(false);
      }
    };
    void load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  const displayed = useMemo(() => {
    if (filter === 'active') {
      return interviews.filter(i => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(i.current_stage));
    }
    return interviews;
  }, [interviews, filter]);

  const upcoming = useMemo(() =>
    interviews.filter(i =>
      ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS'].includes(i.current_stage)
    ),
  [interviews]);

  const stats = useMemo(() => ({
    total:     interviews.length,
    active:    interviews.filter(i => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(i.current_stage)).length,
    upcoming:  upcoming.length,
    hired:     interviews.filter(i => i.current_stage === 'HIRED').length,
  }), [interviews, upcoming]);

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>
      <style>{`@keyframes ifFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>
          My Interviews
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          Track every application through the hiring process
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

        {/* Stats row */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem', animation: 'ifFade 0.3s ease' }}>
            {[
              { label: 'Total Applied',    value: stats.total,    color: '#A78BFA', icon: '📋' },
              { label: 'Active',           value: stats.active,   color: '#38BDF8', icon: '⚡' },
              { label: 'Upcoming Rounds',  value: stats.upcoming, color: '#FBBF24', icon: '📅' },
              { label: 'Hired',            value: stats.hired,    color: '#10B981', icon: '🎉' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '1rem', borderRadius: 12, background: '#0D1220',
                border: `1px solid ${s.color}18`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
          {([{ k: 'active', label: `Active (${stats.active})` }, { k: 'all', label: `All (${stats.total})` }] as const).map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              background: filter === t.k ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              border: filter === t.k ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: filter === t.k ? '#A78BFA' : 'rgba(255,255,255,0.45)',
              fontSize: 12, fontWeight: filter === t.k ? 700 : 400,
              fontFamily: 'Sora, sans-serif',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && <p style={{ color: '#F87171', fontSize: 13 }}>{error}</p>}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 100, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'ifFade 1.4s ease infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', animation: 'ifFade 0.3s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>
              {filter === 'active' ? 'No active interviews' : 'No interviews yet'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              {filter === 'active'
                ? 'Check "All" to see your complete history'
                : 'Apply to jobs to start your interview journey'}
            </p>
          </div>
        )}

        {/* Interview list */}
        {!loading && displayed.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'ifFade 0.3s ease' }}>
            {displayed.map(item => (
              <InterviewCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatEvent(event: InterviewEvent): string {
  if (event.event_type === 'stage_changed' || event.event_type === 'STATUS_CHANGED') {
    return `Status moved from ${event.from_stage ?? 'unknown'} to ${event.to_stage ?? 'unknown'}`;
  }

  if (event.event_type === 'round_scheduled') {
    const roundNumber = getNumber(event.metadata, 'round_number');
    return roundNumber ? `Round ${roundNumber} was scheduled` : 'A new interview round was scheduled';
  }

  if (event.event_type === 'ROUND_COMPLETED' || event.event_type === 'round_result_submitted') {
    const result = getString(event.metadata, 'result');
    if (result) {
      return `A round was marked ${result.replaceAll('_', ' ')}`;
    }
  }

  const labels: Record<string, string> = {
    round_scheduled: 'A new interview round was scheduled',
    round_result_submitted: 'A round result was submitted',
    room_started: 'The interview room was started',
    room_ended: 'The interview room was ended',
    STATUS_CHANGED: 'Interview status changed',
    ROUND_COMPLETED: 'Interview round completed',
  };

  return labels[event.event_type] ?? event.event_type.replaceAll('_', ' ');
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getNumber(metadata: InterviewEvent['metadata'], key: string): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' ? value : null;
}

function getString(metadata: InterviewEvent['metadata'], key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
}
