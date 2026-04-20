'use client';

import { useEffect, useMemo, useState } from 'react';
import { interviewApi, type InterviewStage } from '@/lib/axios';

type InterviewItem = {
  id: string;
  current_stage: InterviewStage;
  status_code: number;
  final_status: string | null;
  updated_at: string;
  created_at: string;
  job_title?: string;
  company?: string;
  candidate_name?: string;
  candidate_email?: string;
};

type RoundItem = {
  id: string;
  round_number: number;
  round_type: RoundType;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: InterviewMode | null;
  meeting_join_url: string | null;
  result: RoundResult | null;
  score: number | null;
  feedback: string | null;
};

type RoundType = 'hr' | 'technical' | 'managerial' | 'assignment';
type InterviewMode = 'video' | 'phone' | 'offline';
type RoundResult = 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';

type InterviewEvent = {
  id: string;
  event_type: string;
  from_stage?: string | null;
  to_stage?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

const S = {
  bg: '#07090F',
  card: '#0D1120',
  border: 'rgba(255,255,255,.08)',
  muted: 'rgba(255,255,255,.6)',
  blue: '#38BDF8',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  purple: '#A78BFA',
  white: '#F8FAFC',
};

const stageColor = (stage: string) => {
  if (stage === 'REJECTED' || stage === 'INTERVIEW_FAILED') return S.red;
  if (stage === 'HIRED' || stage === 'INTERVIEW_PASSED') return S.green;
  if (stage === 'SHORTLISTED') return S.blue;
  if (stage.includes('INTERVIEW')) return S.purple;
  return 'rgba(255,255,255,0.75)';
};

const stages = [
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
] as const satisfies readonly InterviewStage[];

export default function RecruiterInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [schedOpen, setSchedOpen] = useState(false);
  const [schedBusy, setSchedBusy] = useState(false);
  const [roundType, setRoundType] = useState<RoundType>('technical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode, setMode] = useState<InterviewMode>('video');

  const [updatingStage, setUpdatingStage] = useState(false);

  const selectedInterview = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId],
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      scheduled: items.filter((item) => item.current_stage === 'INTERVIEW_SCHEDULED').length,
      active: items.filter((item) =>
        ['INTERVIEW_IN_PROGRESS', 'INTERVIEW_PASSED', 'FINAL_REVIEW', 'OFFERED'].includes(item.current_stage),
      ).length,
      hired: items.filter((item) => item.current_stage === 'HIRED').length,
    }),
    [items],
  );

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await interviewApi.listRecruiterInterviews({ limit: 50 });
      const data = (res.data ?? []) as InterviewItem[];
      setItems(data);
      setSelectedId((prev) => (prev && data.some((x) => x.id === prev) ? prev : data[0]?.id ?? null));
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to load recruiter interviews'));
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    try {
      const res = await interviewApi.getRecruiterInterview(id);
      setRounds((res.data?.rounds ?? []) as RoundItem[]);
      setEvents((res.data?.events ?? []) as InterviewEvent[]);
    } catch {
      setRounds([]);
      setEvents([]);
    }
  };

  useEffect(() => {
    void loadList();
    const iv = setInterval(loadList, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRounds([]);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [rounds]);

  const schedule = async () => {
    if (!selectedInterview) return;
    if (!scheduledAt) {
      alert('Please select date/time');
      return;
    }
    try {
      setSchedBusy(true);
      await interviewApi.scheduleRound(selectedInterview.id, {
        roundType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins: Number(durationMins) || 45,
        mode,
      });
      setSchedOpen(false);
      setScheduledAt('');
      await loadDetail(selectedInterview.id);
      await loadList();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to schedule round'));
    } finally {
      setSchedBusy(false);
    }
  };

  const updateStage = async (stage: InterviewStage) => {
    if (!selectedInterview) return;
    try {
      setUpdatingStage(true);
      await interviewApi.updateStage(selectedInterview.id, stage);
      await loadList();
      await loadDetail(selectedInterview.id);
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to update stage'));
    } finally {
      setUpdatingStage(false);
    }
  };

  const submitRoundResult = async (roundId: string, result: RoundResult) => {
    try {
      await interviewApi.submitRoundResult(roundId, { result });
      if (selectedInterview) await loadDetail(selectedInterview.id);
      await loadList();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to update round result'));
    }
  };

  const joinRoom = (round: RoundItem) => {
    if (!selectedInterview) return;
    window.location.href = buildInterviewRoomPath(selectedInterview.id, round.round_number);
  };

  return (
    <main style={{ padding: 20, color: S.white }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Recruiter Interviews</h1>
      <p style={{ color: S.muted, marginBottom: 16 }}>
        Schedule rounds, track outcomes, and join live interview rooms.
      </p>

      {error && <div style={{ color: '#FCA5A5', marginBottom: 12 }}>{error}</div>}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Tracked', value: stats.total, color: S.blue },
          { label: 'Scheduled', value: stats.scheduled, color: S.purple },
          { label: 'Active Review', value: stats.active, color: S.amber },
          { label: 'Hired', value: stats.hired, color: S.green },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${card.color}33`,
              background: `${card.color}14`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: card.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {card.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </section>

      {nextRound && selectedInterview && (
        <section style={{ marginBottom: 16, padding: 14, border: `1px solid ${S.blue}44`, borderRadius: 10, background: `${S.blue}14` }}>
          <div style={{ fontSize: 12, color: S.blue, fontWeight: 800 }}>Next Scheduled Round</div>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            {selectedInterview.candidate_name ?? 'Candidate'} · Round {nextRound.round_number} ({nextRound.round_type.toUpperCase()}) ·{' '}
            {nextRound.scheduled_at ? new Date(nextRound.scheduled_at).toLocaleString() : 'TBD'}
          </div>
          <button
            onClick={() => joinRoom(nextRound)}
            style={{ marginTop: 10, border: 'none', borderRadius: 8, padding: '8px 12px', background: S.blue, color: '#001018', fontWeight: 800, cursor: 'pointer' }}
          >
            Join Interview Room
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <section style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, fontWeight: 700 }}>
            Interviews
          </div>

          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 12, color: S.muted }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, color: S.muted }}>No interviews found.</div>
            ) : (
              items.map((it) => {
                const active = selectedId === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: `1px solid rgba(255,255,255,.06)`,
                      padding: 12,
                      color: S.white,
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{it.job_title ?? 'Role'}</div>
                    <div style={{ fontSize: 12, color: S.muted }}>{it.company ?? '-'} · {it.candidate_name ?? 'Candidate'}</div>
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: stageColor(it.current_stage) }}>
                      {it.current_stage}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, fontWeight: 700 }}>
            {selectedInterview ? `Interview Details` : 'Select an interview'}
          </div>

          {!selectedInterview ? (
            <div style={{ padding: 12, color: S.muted }}>Select from the left panel.</div>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedInterview.job_title ?? 'Role'}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>
                    {selectedInterview.company ?? '-'} · {selectedInterview.candidate_name ?? '-'} {selectedInterview.candidate_email ? `(${selectedInterview.candidate_email})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    disabled={updatingStage}
                    value={selectedInterview.current_stage}
                    onChange={(e) => void updateStage(e.target.value as InterviewStage)}
                    style={{
                      background: 'rgba(255,255,255,.05)',
                      border: `1px solid ${S.border}`,
                      color: S.white,
                      borderRadius: 8,
                      padding: '8px 10px',
                    }}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s} style={{ color: '#111' }}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setSchedOpen((v) => !v)}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 12px',
                      background: S.green,
                      color: '#052E16',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {schedOpen ? 'Close Scheduler' : 'Schedule Round'}
                  </button>
                </div>
              </div>

              {schedOpen && (
                <div style={{ marginTop: 12, padding: 10, border: `1px solid ${S.border}`, borderRadius: 10, background: 'rgba(255,255,255,.03)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Schedule New Round</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                    <select value={roundType} onChange={(e) => setRoundType(e.target.value as RoundType)} style={inputStyle}>
                      <option value="hr">HR</option>
                      <option value="technical">Technical</option>
                      <option value="managerial">Managerial</option>
                      <option value="assignment">Assignment</option>
                    </select>

                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      min={15}
                      step={5}
                      value={durationMins}
                      onChange={(e) => setDurationMins(Number(e.target.value))}
                      style={inputStyle}
                    />

                    <select value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)} style={inputStyle}>
                      <option value="video">Video</option>
                      <option value="phone">Phone</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => void schedule()}
                      disabled={schedBusy}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        background: S.blue,
                        color: '#001018',
                        fontWeight: 800,
                        cursor: schedBusy ? 'wait' : 'pointer',
                        opacity: schedBusy ? 0.7 : 1,
                      }}
                    >
                      {schedBusy ? 'Scheduling…' : 'Confirm Schedule'}
                    </button>
                  </div>
                </div>
              )}

              <h3 style={{ margin: '14px 0 8px', fontSize: 14 }}>Rounds</h3>
              {rounds.length === 0 ? (
                <div style={{ color: S.muted, fontSize: 13 }}>No rounds scheduled yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rounds.map((r) => (
                    <div key={r.id} style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          Round {r.round_number}: {r.round_type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: S.muted }}>{r.result ?? 'pending'}</div>
                      </div>

                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
                        {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : 'Not scheduled'} · {r.mode ?? '-'} · {r.duration_mins ?? '-'} mins
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => joinRoom(r)} style={linkBtn}>Join Room</button>
                        <button
                          onClick={() => {
                            if (!selectedInterview) return;
                            window.location.href = `/recruiter/interviews/${selectedInterview.id}/feedback?roundId=${r.id}`;
                          }}
                          style={miniBtn(S.purple, '#140C2C')}
                        >
                          Feedback
                        </button>
                        <button onClick={() => void submitRoundResult(r.id, 'pass')} style={miniBtn(S.green, '#052E16')}>Mark Pass</button>
                        <button onClick={() => void submitRoundResult(r.id, 'fail')} style={miniBtn(S.red, '#fff')}>Mark Fail</button>
                        <button onClick={() => void submitRoundResult(r.id, 'no_show')} style={miniBtn(S.amber, '#111827')}>No Show</button>
                      </div>

                      {typeof r.score === 'number' && (
                        <div style={{ marginTop: 8, fontSize: 12, color: S.purple }}>Score: {r.score}</div>
                      )}
                      {r.feedback && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{r.feedback}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {events.length > 0 && (
                <>
                  <h3 style={{ margin: '16px 0 8px', fontSize: 14 }}>Tracking Timeline</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {events.slice(0, 8).map((event) => (
                      <div key={event.id} style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                          {formatEvent(event)}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: S.muted }}>
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  color: '#F8FAFC',
  borderRadius: 8,
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'inherit',
};

const linkBtn: React.CSSProperties = {
  border: 'none',
  borderRadius: 7,
  padding: '6px 10px',
  background: '#38BDF8',
  color: '#001018',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
};

const miniBtn = (bg: string, color: string): React.CSSProperties => ({
  border: 'none',
  borderRadius: 7,
  padding: '6px 10px',
  background: bg,
  color,
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
});

function formatEvent(event: InterviewEvent): string {
  if (event.event_type === 'stage_changed' || event.event_type === 'STATUS_CHANGED') {
    return `Stage moved from ${event.from_stage ?? 'unknown'} to ${event.to_stage ?? 'unknown'}`;
  }

  if (event.event_type === 'round_scheduled') {
    const roundNumber = getNumber(event.metadata, 'round_number');
    return roundNumber ? `Round ${roundNumber} scheduled` : 'Round scheduled';
  }

  if (event.event_type === 'ROUND_COMPLETED' || event.event_type === 'round_result_submitted') {
    const roundId = getString(event.metadata, 'roundId') ?? getString(event.metadata, 'round_id');
    const result = getString(event.metadata, 'result');
    if (result) {
      return `${roundId ? `Round ${roundId}` : 'Interview round'} marked ${result.replaceAll('_', ' ')}`;
    }
  }

  const labels: Record<string, string> = {
    round_scheduled: 'Round scheduled',
    round_result_submitted: 'Round result submitted',
    room_started: 'Live room started',
    room_ended: 'Live room ended',
    STATUS_CHANGED: 'Status changed',
    ROUND_COMPLETED: 'Round completed',
  };

  return labels[event.event_type] ?? event.event_type.replaceAll('_', ' ');
}

function buildInterviewRoomPath(interviewId: string, roundNumber: number): string {
  return `/interviews/room/jc-${interviewId}-r${roundNumber}`;
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
