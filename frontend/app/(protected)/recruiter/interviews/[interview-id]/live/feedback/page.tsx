'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/recruiter/interviews/[interview-id]/live/feedback/page.tsx

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import {
  feedbackApi,
  interviewApi,
  type CreateFeedbackPayload,
  type FeedbackRecommendation,
} from '@/lib/axios';

type RouteParams = Record<string, string | string[]>;

type Round = {
  id: string;
  round_number?: number | null;
  roundNumber?: number | null;
  round_type?: string | null;
  roundType?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  result?: string | null;
};

type InterviewDetail = {
  interview?: {
    id?: string | null;
    current_stage?: string | null;
    currentStage?: string | null;
    job_title?: string | null;
    jobTitle?: string | null;
    company?: string | null;
    company_name?: string | null;
    companyName?: string | null;
    candidate_name?: string | null;
    candidateName?: string | null;
    candidate_email?: string | null;
    candidateEmail?: string | null;
  } | null;
  rounds?: Round[] | null;
};

type ExistingFeedback = {
  id: string;
  technical_score?: number | null;
  communication_score?: number | null;
  problem_solving_score?: number | null;
  culture_fit_score?: number | null;
  overall_score?: number | null;
  recommendation?: FeedbackRecommendation | null;
  strengths?: string | null;
  improvements?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const C = {
  bg: '#080C14',
  panel: '#0D1220',
  panel2: '#101827',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(167,139,250,0.35)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  sky: '#38BDF8',
  purple: '#A78BFA',
  green: '#34D399',
  yellow: '#FBBF24',
  red: '#F87171',
};

const RECOMMENDATIONS: { value: FeedbackRecommendation; label: string; tone: string }[] = [
  { value: 'HIRE', label: 'Hire', tone: C.green },
  { value: 'HOLD', label: 'Hold / Review', tone: C.yellow },
  { value: 'REJECT', label: 'Reject', tone: C.red },
];

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

function clampScore(value: unknown, fallback = 3): number {
  const parsed = safeNumber(value, fallback);
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function getParam(params: RouteParams | null | undefined, key: string): string {
  const value = params?.[key];

  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? '';

  return '';
}

function getInterviewId(params: RouteParams | null | undefined): string {
  return (
    getParam(params, 'interview-id') ||
    getParam(params, 'interviewId') ||
    getParam(params, 'id')
  );
}

function toArray<T>(raw: unknown, key?: string): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== 'object') return [];

  const obj = raw as Record<string, unknown>;
  const keys = ['data', 'items', 'results', 'rounds', 'feedback', key].filter(Boolean) as string[];

  for (const candidate of keys) {
    const value = obj[candidate];

    if (Array.isArray(value)) return value as T[];

    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;

      if (Array.isArray(nested.data)) return nested.data as T[];
      if (Array.isArray(nested.items)) return nested.items as T[];
      if (Array.isArray(nested.results)) return nested.results as T[];
      if (Array.isArray(nested.rounds)) return nested.rounds as T[];
      if (Array.isArray(nested.feedback)) return nested.feedback as T[];
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

function getRoundNumber(round?: Round | null): number {
  return safeNumber(round?.round_number ?? round?.roundNumber, 1);
}

function getRoundType(round?: Round | null): string {
  return safeString(round?.round_type ?? round?.roundType, 'technical');
}

function getRoundResult(round?: Round | null): string {
  return safeString(round?.result, 'pending');
}

function getRoundScheduledAt(round?: Round | null): string | null {
  return round?.scheduled_at ?? round?.scheduledAt ?? null;
}

function getRoundLabel(round?: Round | null): string {
  if (!round) return 'Round';

  const number = getRoundNumber(round);
  const type = safeUpper(getRoundType(round), 'TECHNICAL');
  const result = getRoundResult(round);

  return `Round ${number}: ${type}${result && result !== 'pending' ? ` (${result.replaceAll('_', ' ')})` : ''}`;
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

function getInterviewFromPayload(payload: unknown): InterviewDetail['interview'] {
  if (!payload || typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;

  if (obj.interview && typeof obj.interview === 'object') {
    return obj.interview as InterviewDetail['interview'];
  }

  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;

    if (data.interview && typeof data.interview === 'object') {
      return data.interview as InterviewDetail['interview'];
    }
  }

  return null;
}

function getRoundsFromPayload(payload: unknown): Round[] {
  return toArray<Round>(payload, 'rounds').filter((round) => round && typeof round === 'object' && round.id);
}

function getFeedbackFromPayload(payload: unknown): ExistingFeedback | null {
  if (!payload || typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;

  if (obj.id) return obj as ExistingFeedback;

  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;

    if (data.id) return data as ExistingFeedback;
    if (data.feedback && typeof data.feedback === 'object') return data.feedback as ExistingFeedback;
  }

  if (obj.feedback && typeof obj.feedback === 'object') return obj.feedback as ExistingFeedback;

  return null;
}

function ScoreSelector({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  icon: string;
}) {
  const [hovered, setHovered] = useState(0);

  const scoreLabels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
  const scoreColors = ['', '#F87171', '#FB923C', '#FBBF24', '#34D399', '#10B981'];
  const display = hovered || value;
  const color = scoreColors[display] || C.border;

  return (
    <div
      style={{
        padding: '1rem 1.25rem',
        borderRadius: 16,
        border: `1px solid ${display ? `${color}44` : C.border}`,
        background: display ? `${color}08` : 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={scoreHeaderStyle}>
        <div>
          <strong style={scoreTitleStyle}>
            {icon} {label}
          </strong>
          <p style={scoreDescriptionStyle}>{description}</p>
        </div>

        <span style={{ ...scoreValueStyle, color }}>{value}/5</span>
      </div>

      <div style={starsRowStyle}>
        {[1, 2, 3, 4, 5].map((score) => {
          const active = score <= display;

          return (
            <button
              key={score}
              type="button"
              onMouseEnter={() => setHovered(score)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => onChange(score)}
              style={{
                ...starButtonStyle,
                color: active ? color : 'rgba(255,255,255,0.16)',
                transform: active ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              ★
            </button>
          );
        })}
      </div>

      <p style={{ ...scoreLabelStyle, color }}>
        {scoreLabels[display] || 'Select score'}
      </p>
    </div>
  );
}

export default function FeedbackFormPage() {
  const params = useParams<RouteParams>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const interviewId = useMemo(() => getInterviewId(params), [params]);
  const roundIdFromQuery = searchParams.get('roundId');

  const [interview, setInterview] = useState<InterviewDetail['interview']>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [existingFeedback, setExistingFeedback] = useState<ExistingFeedback | null>(null);

  const [technicalScore, setTechnicalScore] = useState(3);
  const [communicationScore, setCommunicationScore] = useState(3);
  const [problemSolvingScore, setProblemSolvingScore] = useState(3);
  const [cultureFitScore, setCultureFitScore] = useState(3);
  const [recommendation, setRecommendation] = useState<FeedbackRecommendation>('HOLD');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedRound = useMemo(
    () => rounds.find((round) => round.id === selectedRoundId) ?? null,
    [rounds, selectedRoundId],
  );

  const overallScore = useMemo(() => {
    const total = technicalScore + communicationScore + problemSolvingScore + cultureFitScore;
    return Math.round((total / 20) * 100);
  }, [technicalScore, communicationScore, problemSolvingScore, cultureFitScore]);

  const candidateName = safeString(
    interview?.candidateName ?? interview?.candidate_name,
    'Candidate',
  );

  const candidateEmail = safeString(
    interview?.candidateEmail ?? interview?.candidate_email,
    'No email shown',
  );

  const jobTitle = safeString(
    interview?.jobTitle ?? interview?.job_title,
    'Job',
  );

  const company = safeString(
    interview?.companyName ?? interview?.company_name ?? interview?.company,
    'Company',
  );

  const applyFeedbackToForm = useCallback((feedback: ExistingFeedback | null) => {
    if (!feedback) {
      setExistingFeedback(null);
      setTechnicalScore(3);
      setCommunicationScore(3);
      setProblemSolvingScore(3);
      setCultureFitScore(3);
      setRecommendation('HOLD');
      setStrengths('');
      setImprovements('');
      setNotes('');
      return;
    }

    setExistingFeedback(feedback);
    setTechnicalScore(clampScore(feedback.technical_score, 3));
    setCommunicationScore(clampScore(feedback.communication_score, 3));
    setProblemSolvingScore(clampScore(feedback.problem_solving_score, 3));
    setCultureFitScore(clampScore(feedback.culture_fit_score, 3));
    setRecommendation(feedback.recommendation ?? 'HOLD');
    setStrengths(safeString(feedback.strengths));
    setImprovements(safeString(feedback.improvements));
    setNotes(safeString(feedback.notes));
  }, []);

  const loadInterview = useCallback(async () => {
    if (!interviewId) {
      setError('Missing interview id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await interviewApi.getRecruiterInterview(interviewId);
      const payload = response.data;

      const nextInterview = getInterviewFromPayload(payload);
      const nextRounds = getRoundsFromPayload(payload);

      setInterview(nextInterview);
      setRounds(nextRounds);

      const preferredRoundId =
        roundIdFromQuery && nextRounds.some((round) => round.id === roundIdFromQuery)
          ? roundIdFromQuery
          : nextRounds[0]?.id ?? '';

      setSelectedRoundId(preferredRoundId);

      if (!preferredRoundId) {
        applyFeedbackToForm(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load interview feedback page.'));
      setInterview(null);
      setRounds([]);
    } finally {
      setLoading(false);
    }
  }, [applyFeedbackToForm, interviewId, roundIdFromQuery]);

  const loadFeedbackForRound = useCallback(
    async (roundId: string) => {
      if (!roundId) {
        applyFeedbackToForm(null);
        return;
      }

      setFeedbackLoading(true);
      setError('');

      try {
        const response = await feedbackApi.getByRound(roundId);
        const feedback = getFeedbackFromPayload(response.data);
        applyFeedbackToForm(feedback);
      } catch (err: any) {
        const status = err?.response?.status;

        if (status === 404) {
          applyFeedbackToForm(null);
        } else {
          setError(getErrorMessage(err, 'Failed to load existing feedback.'));
          applyFeedbackToForm(null);
        }
      } finally {
        setFeedbackLoading(false);
      }
    },
    [applyFeedbackToForm],
  );

  useEffect(() => {
    void loadInterview();
  }, [loadInterview]);

  useEffect(() => {
    if (!selectedRoundId) return;
    void loadFeedbackForRound(selectedRoundId);
  }, [loadFeedbackForRound, selectedRoundId]);

  async function submitFeedback() {
    if (!selectedRoundId) {
      setError('Select a round before submitting feedback.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload: CreateFeedbackPayload = {
      technical_score: technicalScore,
      communication_score: communicationScore,
      problem_solving_score: problemSolvingScore,
      culture_fit_score: cultureFitScore,
      strengths: strengths.trim(),
      improvements: improvements.trim(),
      notes: notes.trim(),
      recommendation,
    };

    try {
      if (existingFeedback?.id) {
        await feedbackApi.update(existingFeedback.id, payload);
      } else {
        await feedbackApi.create(selectedRoundId, payload);
      }

      const result =
        recommendation === 'HIRE'
          ? 'pass'
          : recommendation === 'REJECT'
            ? 'fail'
            : 'pending';

      await interviewApi.submitRoundResult(selectedRoundId, {
        result,
        score: overallScore,
        feedback: notes.trim() || strengths.trim() || improvements.trim(),
      });

      setSuccess('Feedback saved successfully.');

      window.setTimeout(() => {
        router.push('/recruiter/interviews');
      }, 900);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save feedback.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={centerCardStyle}>
          <div style={loaderStyle} />
          <h1 style={centerTitleStyle}>Loading feedback form...</h1>
          <p style={centerTextStyle}>Fetching interview rounds and candidate details.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Post Interview Evaluation</p>
          <h1 style={titleStyle}>Feedback Form</h1>
          <p style={subtitleStyle}>
            Score the selected interview round and submit recruiter feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/recruiter/interviews')}
          style={secondaryButtonStyle}
        >
          Back to Interviews
        </button>
      </header>

      {error && <section style={errorBoxStyle}>{error}</section>}
      {success && <section style={successBoxStyle}>{success}</section>}

      <section style={summaryCardStyle}>
        <div>
          <h2 style={candidateTitleStyle}>{candidateName}</h2>
          <p style={mutedTextStyle}>{candidateEmail}</p>
          <p style={mutedTextStyle}>
            {jobTitle} · {company}
          </p>
        </div>

        <div style={overallBoxStyle}>
          <strong style={{ color: overallScore >= 75 ? C.green : overallScore >= 50 ? C.yellow : C.red }}>
            {overallScore}%
          </strong>
          <span>Overall</span>
        </div>
      </section>

      <section style={layoutStyle}>
        <aside style={roundsPanelStyle}>
          <div style={panelHeaderStyle}>
            <strong>Interview Rounds</strong>
            <span>{rounds.length}</span>
          </div>

          {rounds.length ? (
            <div style={roundListStyle}>
              {rounds.map((round) => {
                const active = round.id === selectedRoundId;

                return (
                  <button
                    key={round.id}
                    type="button"
                    onClick={() => setSelectedRoundId(round.id)}
                    style={{
                      ...roundButtonStyle,
                      borderColor: active ? C.borderStrong : C.border,
                      background: active ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <strong>{getRoundLabel(round)}</strong>
                    <span>{formatDateTime(getRoundScheduledAt(round))}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={emptyTextStyle}>No interview rounds found. Schedule a round first.</p>
          )}
        </aside>

        <section style={formPanelStyle}>
          {selectedRound ? (
            <>
              <div style={selectedRoundHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Selected Round</p>
                  <h2 style={sectionTitleStyle}>{getRoundLabel(selectedRound)}</h2>
                  <p style={mutedTextStyle}>{formatDateTime(getRoundScheduledAt(selectedRound))}</p>
                </div>

                {feedbackLoading && <span style={loadingPillStyle}>Loading feedback...</span>}
                {existingFeedback?.id && <span style={existingPillStyle}>Existing feedback</span>}
              </div>

              <div style={scoreGridStyle}>
                <ScoreSelector
                  icon="💻"
                  label="Technical"
                  description="Technical depth, role skills, coding/design understanding."
                  value={technicalScore}
                  onChange={setTechnicalScore}
                />

                <ScoreSelector
                  icon="🗣️"
                  label="Communication"
                  description="Clarity, confidence, explanation quality."
                  value={communicationScore}
                  onChange={setCommunicationScore}
                />

                <ScoreSelector
                  icon="🧩"
                  label="Problem Solving"
                  description="Debugging, reasoning, practical thinking."
                  value={problemSolvingScore}
                  onChange={setProblemSolvingScore}
                />

                <ScoreSelector
                  icon="🤝"
                  label="Culture Fit"
                  description="Professional attitude, ownership, collaboration."
                  value={cultureFitScore}
                  onChange={setCultureFitScore}
                />
              </div>

              <section style={recommendationPanelStyle}>
                <p style={fieldLabelStyle}>Recommendation</p>

                <div style={recommendationRowStyle}>
                  {RECOMMENDATIONS.map((item) => {
                    const active = recommendation === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setRecommendation(item.value)}
                        style={{
                          ...recommendationButtonStyle,
                          borderColor: active ? `${item.tone}88` : C.border,
                          background: active ? `${item.tone}18` : 'rgba(255,255,255,0.03)',
                          color: active ? item.tone : C.muted,
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div style={textareaGridStyle}>
                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Strengths</span>
                  <textarea
                    value={strengths}
                    onChange={(event) => setStrengths(event.target.value)}
                    placeholder="What did the candidate do well?"
                    style={textareaStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Improvements</span>
                  <textarea
                    value={improvements}
                    onChange={(event) => setImprovements(event.target.value)}
                    placeholder="Where should the candidate improve?"
                    style={textareaStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Recruiter Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Final observations, next steps, decision notes..."
                    style={{ ...textareaStyle, minHeight: 130 }}
                  />
                </label>
              </div>

              <div style={footerActionStyle}>
                <button
                  type="button"
                  onClick={() => router.push('/recruiter/interviews')}
                  style={secondaryButtonStyle}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void submitFeedback()}
                  disabled={saving}
                  style={{
                    ...primaryButtonStyle,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : existingFeedback?.id ? 'Update Feedback' : 'Submit Feedback'}
                </button>
              </div>
            </>
          ) : (
            <div style={emptyBigStyle}>
              <strong>No round selected</strong>
              <p>Select a round from the left side to submit feedback.</p>
            </div>
          )}
        </section>
      </section>
    </main>
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
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  marginBottom: 18,
};

const eyebrowStyle: CSSProperties = {
  margin: '0 0 6px',
  color: C.purple,
  fontSize: 11,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 950,
  letterSpacing: '-0.05em',
};

const subtitleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: C.faint,
  fontSize: 14,
};

const summaryCardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 22,
  padding: '1.25rem',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  marginBottom: 18,
};

const candidateTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 950,
};

const mutedTextStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.muted,
  fontSize: 13,
};

const overallBoxStyle: CSSProperties = {
  width: 112,
  height: 92,
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  background: C.panel2,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '320px 1fr',
  gap: 16,
};

const roundsPanelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 20,
  overflow: 'hidden',
  height: 'fit-content',
};

const panelHeaderStyle: CSSProperties = {
  padding: '1rem',
  borderBottom: `1px solid ${C.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  color: C.text,
};

const roundListStyle: CSSProperties = {
  padding: 12,
  display: 'grid',
  gap: 10,
};

const roundButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '0.9rem',
  color: C.text,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
  display: 'grid',
  gap: 5,
};

const formPanelStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  background: C.panel,
  borderRadius: 20,
  padding: '1.25rem',
};

const selectedRoundHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  paddingBottom: 16,
  borderBottom: `1px solid ${C.border}`,
  marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 950,
};

const scoreGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
};

const scoreHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 12,
};

const scoreTitleStyle: CSSProperties = {
  display: 'block',
  fontSize: 14,
  color: C.text,
};

const scoreDescriptionStyle: CSSProperties = {
  margin: '5px 0 0',
  color: C.faint,
  fontSize: 12,
  lineHeight: 1.5,
};

const scoreValueStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 950,
};

const starsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
};

const starButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 25,
  transition: '0.15s ease',
};

const scoreLabelStyle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 12,
  fontWeight: 850,
};

const recommendationPanelStyle: CSSProperties = {
  marginTop: 18,
  border: `1px solid ${C.border}`,
  background: C.panel2,
  borderRadius: 18,
  padding: '1rem',
};

const recommendationRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const recommendationButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 950,
  fontFamily: "'Sora', sans-serif",
};

const textareaGridStyle: CSSProperties = {
  marginTop: 18,
  display: 'grid',
  gap: 14,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const fieldLabelStyle: CSSProperties = {
  color: C.faint,
  fontSize: 12,
  fontWeight: 950,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: 96,
  resize: 'vertical',
  boxSizing: 'border-box',
  border: `1px solid ${C.border}`,
  background: C.panel2,
  color: C.text,
  borderRadius: 14,
  padding: '12px 14px',
  outline: 'none',
  fontFamily: "'Sora', sans-serif",
  lineHeight: 1.6,
};

const footerActionStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  marginTop: 18,
};

const primaryButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 14,
  padding: '12px 18px',
  color: '#020617',
  fontWeight: 950,
  cursor: 'pointer',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, #F472B6)`,
  fontFamily: "'Sora', sans-serif",
};

const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '12px 18px',
  color: C.text,
  fontWeight: 850,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
  fontFamily: "'Sora', sans-serif",
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

const successBoxStyle: CSSProperties = {
  border: '1px solid rgba(52,211,153,0.28)',
  background: 'rgba(52,211,153,0.08)',
  color: '#86EFAC',
  borderRadius: 16,
  padding: '12px 14px',
  marginBottom: 16,
  fontSize: 13,
  fontWeight: 850,
};

const centerCardStyle: CSSProperties = {
  minHeight: '70vh',
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
};

const centerTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 22,
  fontWeight: 950,
};

const centerTextStyle: CSSProperties = {
  margin: 0,
  color: C.faint,
};

const loaderStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: '3px solid rgba(56,189,248,0.18)',
  borderTopColor: C.sky,
};

const emptyTextStyle: CSSProperties = {
  padding: '1rem',
  color: C.faint,
  fontSize: 13,
};

const emptyBigStyle: CSSProperties = {
  minHeight: 360,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  color: C.faint,
};

const loadingPillStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  padding: '6px 10px',
  color: C.faint,
  fontSize: 11,
  fontWeight: 850,
};

const existingPillStyle: CSSProperties = {
  border: '1px solid rgba(52,211,153,0.28)',
  background: 'rgba(52,211,153,0.10)',
  borderRadius: 999,
  padding: '6px 10px',
  color: C.green,
  fontSize: 11,
  fontWeight: 950,
};