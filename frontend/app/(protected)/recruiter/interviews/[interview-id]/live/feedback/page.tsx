'use client';

// frontend/app/(protected)/recruiter/interviews/[interviewId]/feedback/page.tsx
//
// Post-interview feedback form for recruiters.
//
// Architecture:
//   - Route: /recruiter/interviews/[interviewId]/feedback?roundId=<uuid>
//   - If roundId is provided → feedback for that specific round
//   - Otherwise → recruiter picks which round to score
//   - On submit → POST /feedback/round/:roundId
//   - Auto-navigates back with success toast after submission

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { interviewApi, feedbackApi, CreateFeedbackPayload, FeedbackRecommendation } from '@/lib/axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Round {
  id:            string;
  round_number:  number;
  round_type:    string;
  scheduled_at:  string | null;
  result:        string | null;
}

interface InterviewDetail {
  interview: {
    id:              string;
    current_stage:   string;
    job_id:          string;
    candidate_id:    string;
    recruiter_id:    string;
    job_title?:      string;
    company?:        string;
    candidate_name?: string;
    candidate_email?:string;
  };
  rounds: Round[];
}

interface ExistingFeedback {
  id: string;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  culture_fit_score: number;
  overall_score: number;
  recommendation: FeedbackRecommendation;
  strengths?: string | null;
  improvements?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Selector (5-star visual rating)
// ─────────────────────────────────────────────────────────────────────────────

function ScoreSelector({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label:       string;
  description: string;
  value:       number;
  onChange:    (v: number) => void;
  icon:        string;
}) {
  const [hovered, setHovered] = useState(0);

  const SCORE_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
  const SCORE_COLORS = ['', '#F87171', '#FB923C', '#FBBF24', '#34D399', '#10B981'];

  const display = hovered || value;

  return (
    <div style={{
      padding: '1rem 1.25rem', borderRadius: 12,
      border: `1px solid ${display ? `${SCORE_COLORS[display]}30` : 'rgba(255,255,255,0.08)'}`,
      background: display ? `${SCORE_COLORS[display]}06` : 'rgba(255,255,255,0.02)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{label}</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
        {display > 0 && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: SCORE_COLORS[display], fontFamily: 'monospace', lineHeight: 1 }}>
              {display}/5
            </div>
            <div style={{ fontSize: 10, color: SCORE_COLORS[display], marginTop: 2, fontWeight: 600 }}>
              {SCORE_LABELS[display]}
            </div>
          </div>
        )}
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            style={{
              flex: 1, height: 40, borderRadius: 8, border: 'none',
              cursor: 'pointer', transition: 'all 0.15s',
              background: n <= (hovered || value)
                ? SCORE_COLORS[hovered || value]
                : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
              transform: n === hovered ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {n <= (hovered || value) ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Selector
// ─────────────────────────────────────────────────────────────────────────────

function RecommendationSelector({
  value,
  onChange,
}: {
  value:    FeedbackRecommendation | '';
  onChange: (v: FeedbackRecommendation) => void;
}) {
  const options: {
    value: FeedbackRecommendation;
    label: string;
    sub:   string;
    icon:  string;
    color: string;
    bg:    string;
    border:string;
  }[] = [
    {
      value:  'HIRE',
      label:  'Hire',
      sub:    'Strong candidate, recommend proceeding',
      icon:   '🎉',
      color:  '#10B981',
      bg:     'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.4)',
    },
    {
      value:  'HOLD',
      label:  'Hold',
      sub:    'Needs further evaluation or comparison',
      icon:   '⏸',
      color:  '#FBBF24',
      bg:     'rgba(251,191,36,0.1)',
      border: 'rgba(251,191,36,0.4)',
    },
    {
      value:  'REJECT',
      label:  'Reject',
      sub:    'Not a fit for this role at this time',
      icon:   '✗',
      color:  '#F87171',
      bg:     'rgba(248,113,113,0.1)',
      border: 'rgba(248,113,113,0.4)',
    },
  ];

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Final Recommendation *
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${value === opt.value ? opt.border : 'rgba(255,255,255,0.08)'}`,
              background: value === opt.value ? opt.bg : 'rgba(255,255,255,0.02)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'all 0.2s', fontFamily: 'Sora, sans-serif',
              transform: value === opt.value ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: 24 }}>{opt.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: value === opt.value ? opt.color : '#F1F5F9' }}>
              {opt.label}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.4 }}>
              {opt.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedbackFormPage() {
  const params       = useParams<Record<string, string | string[]>>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const interviewId  = getRouteParam(params, 'interview-id');
  const preselectedRoundId = searchParams?.get('roundId');

  // ── Load interview details ──────────────────────────────────────────────
  const [detail,     setDetail]     = useState<InterviewDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState<string>(preselectedRoundId ?? '');

  // ── Form state ──────────────────────────────────────────────────────────
  const [technicalScore,      setTechnicalScore]      = useState(0);
  const [communicationScore,  setCommunicationScore]  = useState(0);
  const [problemSolvingScore, setProblemSolvingScore] = useState(0);
  const [cultureFitScore,     setCultureFitScore]     = useState(3);
  const [recommendation,      setRecommendation]      = useState<FeedbackRecommendation | ''>('');
  const [strengths,           setStrengths]           = useState('');
  const [improvements,        setImprovements]        = useState('');
  const [notes,               setNotes]               = useState('');

  // ── Submission state ────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  // ── Existing feedback ───────────────────────────────────────────────────
  const [existing, setExisting] = useState<ExistingFeedback | null>(null);

  useEffect(() => {
    if (!interviewId) return;
    setLoadingDetail(true);
    interviewApi.getRecruiterInterview(interviewId)
      .then(r => {
        setDetail(r.data as InterviewDetail);
        if (!selectedRoundId && r.data?.rounds?.length > 0) {
          // Auto-select the most recent round
          const lastRound = r.data.rounds[r.data.rounds.length - 1];
          setSelectedRoundId(lastRound.id);
        }
      })
      .catch(() => setError('Failed to load interview details'))
      .finally(() => setLoadingDetail(false));
  }, [interviewId, selectedRoundId]);

  // Load existing feedback when round is selected
  useEffect(() => {
    if (!selectedRoundId) return;
    feedbackApi.getByRound(selectedRoundId)
      .then(r => {
        const f = r.data as ExistingFeedback;
        setExisting(f);
        setTechnicalScore(f.technical_score);
        setCommunicationScore(f.communication_score);
        setProblemSolvingScore(f.problem_solving_score);
        setCultureFitScore(f.culture_fit_score);
        setRecommendation(f.recommendation);
        setStrengths(f.strengths ?? '');
        setImprovements(f.improvements ?? '');
        setNotes(f.notes ?? '');
      })
      .catch(() => {
        // 404 = no feedback yet, that's fine
        setExisting(null);
      });
  }, [selectedRoundId]);

  const overallScore = technicalScore && communicationScore && problemSolvingScore && cultureFitScore
    ? ((technicalScore + communicationScore + problemSolvingScore + cultureFitScore) / 4) * 20
    : 0;

  const isValid = technicalScore > 0 && communicationScore > 0 &&
    problemSolvingScore > 0 && recommendation !== '';

  const submit = async () => {
    if (!isValid) { setError('Please rate all dimensions and set a recommendation.'); return; }
    if (!selectedRoundId) { setError('Please select a round.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const payload: CreateFeedbackPayload = {
        technical_score:       technicalScore,
        communication_score:   communicationScore,
        problem_solving_score: problemSolvingScore,
        culture_fit_score:     cultureFitScore,
        recommendation:        recommendation as FeedbackRecommendation,
        strengths:             strengths.trim() || undefined,
        improvements:          improvements.trim() || undefined,
        notes:                 notes.trim() || undefined,
      };

      if (existing) {
        await feedbackApi.update(existing.id, payload);
      } else {
        await feedbackApi.create(selectedRoundId, payload);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/recruiter/interviews`);
      }, 2000);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to submit feedback'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {recommendation === 'HIRE' ? '🎉' : recommendation === 'REJECT' ? '📋' : '⏸'}
          </div>
          <h2 style={{ color: '#34D399', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Feedback Submitted
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
            Recommendation: <strong style={{ color: recommendation === 'HIRE' ? '#10B981' : recommendation === 'REJECT' ? '#F87171' : '#FBBF24' }}>{recommendation}</strong>
            · Score: {overallScore.toFixed(0)}/100
          </p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 8 }}>
            Redirecting to interview panel…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>
      <style>{`
        textarea { resize: vertical; }
        textarea::placeholder, input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0D1220; color: #F1F5F9; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 20, padding: 4 }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>
            {existing ? 'Update Feedback' : 'Submit Interview Feedback'}
          </h1>
          {detail?.interview && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {detail.interview.candidate_name ?? 'Candidate'} · {detail.interview.job_title ?? 'Role'}
            </p>
          )}
        </div>

        {/* Overall score preview */}
        {overallScore > 0 && (
          <div style={{
            textAlign: 'center', padding: '8px 20px', borderRadius: 12,
            background: overallScore >= 80 ? 'rgba(16,185,129,0.1)' : overallScore >= 60 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${overallScore >= 80 ? 'rgba(16,185,129,0.3)' : overallScore >= 60 ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>
            <div style={{
              fontSize: 24, fontWeight: 800, fontFamily: 'monospace',
              color: overallScore >= 80 ? '#10B981' : overallScore >= 60 ? '#FBBF24' : '#F87171',
            }}>
              {overallScore.toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
              Overall / 100
            </div>
          </div>
        )}
      </div>

      {loadingDetail ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          Loading interview details…
        </div>
      ) : (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

          {/* ── Round selector ── */}
          {detail?.rounds && detail.rounds.length > 1 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: 12, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={sectionLabel}>Select Round</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.rounds.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoundId(r.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                      border: selectedRoundId === r.id ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedRoundId === r.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                      color: selectedRoundId === r.id ? '#A78BFA' : 'rgba(255,255,255,0.5)',
                      fontSize: 12, fontWeight: selectedRoundId === r.id ? 700 : 400,
                      fontFamily: 'Sora, sans-serif',
                    }}
                  >
                    Round {r.round_number}: {r.round_type.toUpperCase()}
                    {r.result && r.result !== 'pending' && ` (${r.result})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {existing && (
            <div style={{
              marginBottom: '1rem', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#FBBF24', fontWeight: 600 }}>
                ⚠ Updating existing feedback — submitted on {new Date(existing.created_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* ── Score cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.5rem' }}>
            <ScoreSelector
              label="Technical Skills"
              description="Depth of domain knowledge, coding ability, system design thinking"
              value={technicalScore}
              onChange={setTechnicalScore}
              icon="💻"
            />
            <ScoreSelector
              label="Communication"
              description="Clarity of expression, active listening, ability to explain complex ideas"
              value={communicationScore}
              onChange={setCommunicationScore}
              icon="🗣️"
            />
            <ScoreSelector
              label="Problem Solving"
              description="Analytical reasoning, approach to ambiguous problems, creativity"
              value={problemSolvingScore}
              onChange={setProblemSolvingScore}
              icon="🧠"
            />
            <ScoreSelector
              label="Culture Fit"
              description="Team collaboration, values alignment, attitude and growth mindset"
              value={cultureFitScore}
              onChange={setCultureFitScore}
              icon="🤝"
            />
          </div>

          {/* ── Qualitative notes ── */}
          <div style={{ padding: '1.25rem', borderRadius: 12, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem' }}>
            <p style={sectionLabel}>Qualitative Assessment</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={fieldLabel}>Key Strengths</label>
                <textarea
                  value={strengths}
                  onChange={e => setStrengths(e.target.value)}
                  rows={4}
                  placeholder="What did the candidate do particularly well? E.g., strong system design, clear communication, excellent problem decomposition…"
                  style={textareaStyle}
                />
              </div>
              <div>
                <label style={fieldLabel}>Areas for Improvement</label>
                <textarea
                  value={improvements}
                  onChange={e => setImprovements(e.target.value)}
                  rows={4}
                  placeholder="What gaps were observed? E.g., needed more exposure to distributed systems, could improve on edge case handling…"
                  style={textareaStyle}
                />
              </div>
            </div>

            <div>
              <label style={fieldLabel}>Internal Notes (not shared with candidate)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional context for the hiring team. Compensation expectations, timeline, comparison notes…"
                style={textareaStyle}
              />
            </div>
          </div>

          {/* ── Recommendation ── */}
          <div style={{ padding: '1.25rem', borderRadius: 12, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '1.5rem' }}>
            <RecommendationSelector value={recommendation} onChange={setRecommendation} />
          </div>

          {/* ── Error + Submit ── */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: '1rem',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => router.back()}
              style={{ padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={submitting || !isValid}
              style={{
                flex: 1, padding: '12px 24px', borderRadius: 10, border: 'none',
                background: !isValid || submitting
                  ? 'rgba(255,255,255,0.06)'
                  : recommendation === 'HIRE'
                  ? 'linear-gradient(135deg, #059669, #10B981)'
                  : recommendation === 'REJECT'
                  ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                  : 'linear-gradient(135deg, #D97706, #F59E0B)',
                color: !isValid ? 'rgba(255,255,255,0.3)' : '#fff',
                fontSize: 14, fontWeight: 700, cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Submitting…</>
              ) : (
                `${existing ? 'Update' : 'Submit'} Feedback${recommendation ? ` → ${recommendation}` : ''}`
              )}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function getRouteParam(
  params: Record<string, string | string[]> | null | undefined,
  key: string,
): string {
  const value = params?.[key];
  return typeof value === 'string' ? value : '';
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

// Style constants
const sectionLabel: React.CSSProperties = {
  margin: '0 0 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)',
};

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6,
  color: 'rgba(255,255,255,0.45)',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const, padding: '10px 14px',
  borderRadius: 8, background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9',
  fontSize: 13, outline: 'none', fontFamily: 'Sora, sans-serif', lineHeight: 1.6,
};
