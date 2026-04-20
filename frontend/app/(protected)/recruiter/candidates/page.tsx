'use client';

// frontend/app/(protected)/recruiter/candidates/page.tsx
//
// Full-funnel candidate pipeline for recruiters.
//
// Architecture:
//   - Left column: filter sidebar (by job, by stage)
//   - Center: kanban-style list of all recruiter_interviews
//   - Right: candidate detail panel (slide-in on select)
//
// API integration:
//   - GET /recruiter/interviews?limit=100   (all stages)
//   - POST /recruiter/interviews/:appId/init
//   - PATCH /recruiter/interviews/:id/stage
//   - POST /recruiter/interviews/:id/rounds  (schedule round)

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { interviewApi, type InterviewStage } from '@/lib/axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CandidateRow {
  id:               string;
  current_stage:    InterviewStage;
  status_code:      number;
  final_status:     string | null;
  created_at:       string;
  updated_at:       string;
  job_id:           string;
  candidate_id:     string;
  job_title?:       string;
  company?:         string;
  candidate_name?:  string;
  candidate_email?: string;
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
  feedback:         string | null;
}

interface InterviewEvent {
  id: string;
  event_type: string;
  from_stage?: string | null;
  to_stage?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage metadata
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  APPLIED:              { label: 'Applied',        color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  icon: '📋' },
  UNDER_REVIEW:         { label: 'Under Review',   color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  icon: '🔍' },
  SHORTLISTED:          { label: 'Shortlisted',    color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',  icon: '⭐' },
  INTERVIEW_SCHEDULED:  { label: 'Scheduled',      color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', icon: '📅' },
  INTERVIEW_IN_PROGRESS:{ label: 'In Progress',    color: '#FB923C', bg: 'rgba(251,146,60,0.1)',  icon: '🎥' },
  INTERVIEW_PASSED:     { label: 'Passed',         color: '#34D399', bg: 'rgba(52,211,153,0.1)',  icon: '✅' },
  INTERVIEW_FAILED:     { label: 'Failed',         color: '#F87171', bg: 'rgba(248,113,113,0.1)', icon: '❌' },
  FINAL_REVIEW:         { label: 'Final Review',   color: '#C084FC', bg: 'rgba(192,132,252,0.1)', icon: '🎯' },
  OFFERED:              { label: 'Offered',        color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  icon: '💌' },
  HIRED:                { label: 'Hired',          color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '🎉' },
  REJECTED:             { label: 'Rejected',       color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: '✗'  },
  ON_HOLD:              { label: 'On Hold',        color: '#D97706', bg: 'rgba(217,119,6,0.1)',   icon: '⏸' },
  WITHDRAWN:            { label: 'Withdrawn',      color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: '↩' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleModal
// ─────────────────────────────────────────────────────────────────────────────

function ScheduleModal({
  interviewId,
  onClose,
  onScheduled,
}: {
  interviewId: string;
  onClose:     () => void;
  onScheduled: () => void;
}) {
  const [roundType,    setRoundType]    = useState<'hr' | 'technical' | 'managerial' | 'assignment'>('technical');
  const [scheduledAt,  setScheduledAt]  = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode,         setMode]         = useState<'video' | 'phone' | 'offline'>('video');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const submit = async () => {
    if (!scheduledAt) { setError('Please select date and time'); return; }
    setLoading(true);
    setError('');
    try {
      await interviewApi.scheduleRound(interviewId, {
        roundType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins: Number(durationMins),
        mode,
      });
      onScheduled();
      onClose();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to schedule round'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 460, background: '#0D1220',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '1.5rem',
        }}
      >
        <h3 style={{ margin: '0 0 1.25rem', fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
          Schedule Interview Round
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Round Type */}
          <div>
            <label style={lbl}>Round Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['hr', 'technical', 'managerial', 'assignment'] as const).map(rt => (
                <button key={rt} onClick={() => setRoundType(rt)}
                  style={pillBtn(roundType === rt)}>
                  {rt.charAt(0).toUpperCase() + rt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date/Time */}
          <div>
            <label style={lbl}>Date & Time</label>
            <input type="datetime-local" value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)} style={inp} />
          </div>

          {/* Duration + Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Duration (mins)</label>
              <input type="number" min={15} step={5} value={durationMins}
                onChange={e => setDurationMins(Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value as 'video' | 'phone' | 'offline')} style={inp}>
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {error && <p style={{ color: '#F87171', fontSize: 12, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={ghostBtn}>Cancel</button>
            <button onClick={() => void submit()} disabled={loading}
              style={{ ...primaryBtn, flex: 1, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Scheduling…' : 'Schedule Round'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CandidateDetailPanel (right side)
// ─────────────────────────────────────────────────────────────────────────────

function CandidateDetailPanel({
  item,
  onStageChange,
  onRefresh,
}: {
  item:          CandidateRow;
  onStageChange: (id: string, stage: InterviewStage) => void;
  onRefresh:     () => void;
}) {
  const router = useRouter();
  const [rounds, setRounds]           = useState<Round[]>([]);
  const [events, setEvents]           = useState<InterviewEvent[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [updatingStage, setUpdating]  = useState(false);

  const meta = STAGE_META[item.current_stage] ?? STAGE_META.APPLIED;

  useEffect(() => {
    interviewApi.getRecruiterInterview(item.id)
      .then(r => {
        setRounds((r.data?.rounds ?? []) as Round[]);
        setEvents((r.data?.events ?? []) as InterviewEvent[]);
      })
      .catch(() => {
        setRounds([]);
        setEvents([]);
      });
  }, [item.id]);

  const changeStage = async (stage: InterviewStage) => {
    setUpdating(true);
    try {
      await interviewApi.updateStage(item.id, stage);
      onStageChange(item.id, stage);
    } finally {
      setUpdating(false);
    }
  };

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter(r => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [rounds]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
          }}>
            {(item.candidate_name ?? 'C')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F1F5F9' }}>
              {item.candidate_name ?? 'Candidate'}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {item.candidate_email ?? ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30`,
          }}>
            {meta.icon} {meta.label}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {item.job_title ?? 'Role'} · {item.company ?? ''}
          </span>
        </div>
      </div>

      {/* Upcoming round banner */}
      {nextRound && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: '1rem',
          border: '1px solid rgba(56,189,248,0.25)', background: 'rgba(56,189,248,0.06)',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#38BDF8' }}>
            📅 Upcoming Round {nextRound.round_number}
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            {nextRound.round_type.toUpperCase()} · {nextRound.scheduled_at
              ? new Date(nextRound.scheduled_at).toLocaleString()
              : 'TBD'}
          </p>
          <button
            onClick={() => router.push(buildInterviewRoomPath(item.id, nextRound.round_number))}
            style={primaryBtn}
          >
            🎥 Join Room
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
        <button onClick={() => setShowSchedule(true)} style={actionBtn('#A78BFA', 'rgba(167,139,250,0.1)')}>
          📅 Schedule Round
        </button>
        <button
          onClick={() => router.push(`/recruiter/interviews/${item.id}/feedback`)}
          style={actionBtn('#34D399', 'rgba(52,211,153,0.1)')}
        >
          📝 Give Feedback
        </button>
        <button
          onClick={() => changeStage('SHORTLISTED')}
          disabled={updatingStage || item.current_stage === 'SHORTLISTED'}
          style={actionBtn('#38BDF8', 'rgba(56,189,248,0.1)')}
        >
          ⭐ Shortlist
        </button>
        <button
          onClick={() => changeStage('OFFERED')}
          disabled={updatingStage}
          style={actionBtn('#4ADE80', 'rgba(74,222,128,0.1)')}
        >
          💌 Make Offer
        </button>
      </div>

      {/* Terminal actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        <button onClick={() => changeStage('HIRED')} disabled={updatingStage}
          style={{ ...actionBtn('#10B981', 'rgba(16,185,129,0.1)'), flex: 1 }}>
          🎉 Hire
        </button>
        <button onClick={() => changeStage('REJECTED')} disabled={updatingStage}
          style={{ ...actionBtn('#F87171', 'rgba(248,113,113,0.1)'), flex: 1 }}>
          ✗ Reject
        </button>
      </div>

      {/* Rounds timeline */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Interview Rounds
        </p>
        {rounds.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>No rounds scheduled yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rounds.map(r => (
              <div key={r.id} style={{
                padding: '10px 12px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>
                    Round {r.round_number}: {r.round_type.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                    color: r.result === 'pass' ? '#34D399' : r.result === 'fail' ? '#F87171' : '#FBBF24',
                    background: r.result === 'pass' ? 'rgba(52,211,153,0.1)' : r.result === 'fail' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                  }}>
                    {r.result ?? 'pending'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : 'Not scheduled'} · {r.mode ?? '-'} · {r.duration_mins ?? '-'}m
                </p>
                {typeof r.score === 'number' && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#A78BFA', fontFamily: 'monospace' }}>
                    Score: {r.score.toFixed(0)}/100
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => router.push(buildInterviewRoomPath(item.id, r.round_number))}
                    style={{ fontSize: 11, color: '#38BDF8', background: 'none', border: `1px solid rgba(56,189,248,0.3)`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                    🎥 Join Room
                  </button>
                  <button
                    onClick={() => router.push(`/recruiter/interviews/${item.id}/feedback?roundId=${r.id}`)}
                    style={{ fontSize: 11, color: '#A78BFA', background: 'none', border: `1px solid rgba(167,139,250,0.3)`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                    📝 Feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div style={{ marginTop: '1.25rem' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Activity Timeline
        </p>
        {events.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>No interview events yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.slice(0, 8).map((event) => (
              <div key={event.id} style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>
                  {formatInterviewEvent(event)}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSchedule && (
        <ScheduleModal
          interviewId={item.id}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => {
            setShowSchedule(false);
            onRefresh();
            // Reload rounds
            interviewApi.getRecruiterInterview(item.id)
              .then(r => setRounds((r.data?.rounds ?? []) as Round[]))
              .catch(() => null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RecruiterCandidatesPage() {
  const [candidates,   setCandidates]   = useState<CandidateRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [stageFilter,  setStageFilter]  = useState<InterviewStage | 'ALL'>('ALL');
  const [search,       setSearch]       = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await interviewApi.listRecruiterInterviews({ limit: 200 });
      setCandidates((res.data ?? []) as CandidateRow[]);
      setError('');
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to load candidates'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Poll every 30s
  useEffect(() => {
    const iv = setInterval(() => void load(), 30_000);
    return () => clearInterval(iv);
  }, []);

  const filtered = useMemo(() => {
    let list = candidates;
    if (stageFilter !== 'ALL') list = list.filter(c => c.current_stage === stageFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.candidate_name ?? '').toLowerCase().includes(q) ||
        (c.candidate_email ?? '').toLowerCase().includes(q) ||
        (c.job_title ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, stageFilter, search]);

  // Stage counts for sidebar
  const stageCounts = useMemo(() =>
    candidates.reduce<Record<string, number>>((acc, c) => {
      acc[c.current_stage] = (acc[c.current_stage] ?? 0) + 1;
      return acc;
    }, {}),
  [candidates]);

  const selected = useMemo(() =>
    candidates.find(c => c.id === selectedId) ?? null,
  [candidates, selectedId]);

  const updateStageLocally = (id: string, stage: InterviewStage) => {
    setCandidates(prev =>
      prev.map(c => c.id === id ? { ...c, current_stage: stage } : c)
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>
      <style>{`
        @keyframes cpFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        select option { background: #0D1220; color: #F1F5F9; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      {/* ── Left sidebar: stage filters ── */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: '#0B0F1C', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
            Candidates
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {candidates.length} total
          </p>
        </div>

        <div style={{ padding: '0.5rem 8px', flex: 1 }}>
          <button
            onClick={() => setStageFilter('ALL')}
            style={stageFilterBtn(stageFilter === 'ALL', '#A78BFA', 'rgba(167,139,250,0.1)')}
          >
            <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: stageFilter === 'ALL' ? 700 : 400 }}>All Stages</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{candidates.length}</span>
          </button>

          <div style={{ margin: '6px 4px', height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {(['APPLIED','SHORTLISTED','INTERVIEW_SCHEDULED','INTERVIEW_IN_PROGRESS','INTERVIEW_PASSED','FINAL_REVIEW','OFFERED','HIRED','REJECTED','ON_HOLD'] as InterviewStage[]).map(stage => {
            const meta  = STAGE_META[stage];
            const count = stageCounts[stage] ?? 0;
            if (!count && stageFilter !== stage) return null;
            return (
              <button key={stage} onClick={() => setStageFilter(stage)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: stageFilter === stage ? meta.bg : 'transparent',
                  cursor: 'pointer', marginBottom: 2, fontFamily: 'Sora, sans-serif',
                }}>
                <span style={{ fontSize: 13 }}>{meta.icon}</span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 11, color: stageFilter === stage ? meta.color : 'rgba(255,255,255,0.45)', fontWeight: stageFilter === stage ? 700 : 400 }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 10, color: stageFilter === stage ? meta.color : 'rgba(255,255,255,0.2)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center: candidate list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, role…"
            style={{
              flex: 1, padding: '8px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              color: '#F1F5F9', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={() => void load()} style={ghostBtn}>↻ Refresh</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 74, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'cpFade 1.4s ease infinite' }} />
              ))}
            </div>
          ) : error ? (
            <p style={{ color: '#F87171', fontSize: 13 }}>{error}</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.2)' }}>
              <p style={{ fontSize: 14, margin: 0 }}>No candidates found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map(c => {
                const meta    = STAGE_META[c.current_stage] ?? STAGE_META.APPLIED;
                const isSelected = selectedId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(isSelected ? null : c.id)}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      background: isSelected ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'all 0.15s', animation: 'cpFade 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff',
                    }}>
                      {(c.candidate_name ?? 'C')[0].toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.candidate_name ?? 'Candidate'}
                        </p>
                        <span style={{
                          flexShrink: 0, fontSize: 10, fontWeight: 700,
                          padding: '2px 7px', borderRadius: 20,
                          color: meta.color, background: meta.bg,
                        }}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.job_title ?? 'Role'} · {c.candidate_email ?? ''}
                      </p>
                    </div>

                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                      {new Date(c.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: candidate detail ── */}
      {selected && (
        <div style={{
          width: 380, flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          background: '#0D1220', overflowY: 'auto',
          animation: 'cpFade 0.25s ease',
        }}>
          <CandidateDetailPanel
            item={selected}
            onStageChange={updateStageLocally}
            onRefresh={load}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers (defined outside components — avoids stale closure issues
// and duplicate property TS errors)
// ─────────────────────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px', borderRadius: 8,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#F1F5F9', fontSize: 13, outline: 'none', fontFamily: 'Sora, sans-serif',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
  color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
};

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))',
  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'Sora, sans-serif',
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer',
  fontFamily: 'Sora, sans-serif',
};

function pillBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
    border: active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
    background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#A78BFA' : 'rgba(255,255,255,0.45)', fontSize: 12,
    fontWeight: active ? 700 : 400, fontFamily: 'Sora, sans-serif',
  };
}

function actionBtn(color: string, bg: string): React.CSSProperties {
  return {
    padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
    background: bg, border: `1px solid ${color}33`,
    color, fontSize: 12, fontWeight: 600,
    fontFamily: 'Sora, sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  };
}

function stageFilterBtn(
  active: boolean, color: string, bg: string
): React.CSSProperties {
  return {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 8, border: 'none',
    background: active ? bg : 'transparent', cursor: 'pointer',
    marginBottom: 2, fontFamily: 'Sora, sans-serif', color: active ? color : 'rgba(255,255,255,0.5)',
  };
}

function formatInterviewEvent(event: InterviewEvent): string {
  if (event.event_type === 'STATUS_CHANGED' || event.event_type === 'stage_changed') {
    return `Stage moved from ${event.from_stage ?? 'unknown'} to ${event.to_stage ?? 'unknown'}`;
  }

  const eventMap: Record<string, string> = {
    round_scheduled: getNumber(event.metadata, 'round_number')
      ? `Interview round ${getNumber(event.metadata, 'round_number')} scheduled`
      : 'Interview round scheduled',
    ROUND_COMPLETED: 'Interview round completed',
    round_result_submitted: 'Round result submitted',
    room_started_via_api: 'Live room started',
    room_ended_via_api: 'Live room ended',
    room_started: 'Live room started',
    room_ended: 'Live room ended',
  };

  return eventMap[event.event_type] ?? event.event_type.replaceAll('_', ' ');
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
