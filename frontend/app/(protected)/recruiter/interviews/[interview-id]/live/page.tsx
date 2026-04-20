'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { interviewApi, type InterviewStage } from '@/lib/axios';

type RoundItem = {
  id: string;
  round_number: number;
  round_type: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: string | null;
  meeting_join_url: string | null;
  result: string | null;
  score: number | null;
  feedback: string | null;
};

type InterviewDetail = {
  interview: {
    id: string;
    current_stage: InterviewStage;
    status_code: number;
    final_status: string | null;
    candidate_id: string;
    recruiter_id: string;
    job_id: string;
  };
  rounds: RoundItem[];
  events: Array<{
    id: string;
    event_type: string;
    from_stage: string | null;
    to_stage: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
};

type ChecklistState = {
  joinedOnTime: boolean;
  introClarity: boolean;
  dsAlgo: boolean;
  systemDesign: boolean;
  debugging: boolean;
  communication: boolean;
  cultureFit: boolean;
  confidence: boolean;
};

const initialChecklist: ChecklistState = {
  joinedOnTime: false,
  introClarity: false,
  dsAlgo: false,
  systemDesign: false,
  debugging: false,
  communication: false,
  cultureFit: false,
  confidence: false,
};

const recommendationWeight: Record<string, number> = {
  'Strong Hire': 100,
  Hire: 80,
  'No Hire': 45,
  'Strong No Hire': 20,
};

export default function RecruiterInterviewLivePage() {
  const params = useParams<Record<string, string | string[]>>();
  const router = useRouter();
  const interviewId = getRouteParam(params, 'interview-id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  const [checks, setChecks] = useState<ChecklistState>(initialChecklist);
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [recommendation, setRecommendation] = useState<'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire'>('Hire');

  const [error, setError] = useState('');

  const load = async () => {
    if (!interviewId) return;
    try {
      setLoading(true);
      setError('');
      const res = await interviewApi.getRecruiterInterview(interviewId);
      const d = res.data as InterviewDetail;
      setDetail(d);

      if (!selectedRoundId && d.rounds?.length) {
        const inProgressRound =
          d.rounds.find((r) => r.result === 'pending') ?? d.rounds[d.rounds.length - 1];
        setSelectedRoundId(inProgressRound.id);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to load interview details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const iv = setInterval(() => void load(), 30_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const selectedRound = useMemo(
    () => detail?.rounds.find((r) => r.id === selectedRoundId) ?? null,
    [detail, selectedRoundId],
  );

  const checklistScore = useMemo(() => {
    const entries = Object.values(checks);
    const yes = entries.filter(Boolean).length;
    return Math.round((yes / entries.length) * 100);
  }, [checks]);

  const finalScore = useMemo(() => {
    const weighted = Math.round(checklistScore * 0.7 + recommendationWeight[recommendation] * 0.3);
    return Math.max(0, Math.min(100, weighted));
  }, [checklistScore, recommendation]);

  const suggestedResult = useMemo(() => {
    if (finalScore >= 85) return 'pass';
    if (finalScore >= 65) return 'pass';
    if (finalScore >= 45) return 'fail';
    return 'fail';
  }, [finalScore]);

  const suggestedStage: InterviewStage = useMemo(() => {
    if (recommendation === 'Strong Hire' || recommendation === 'Hire') return 'INTERVIEW_PASSED';
    return 'INTERVIEW_FAILED';
  }, [recommendation]);

  const toggle = (key: keyof ChecklistState) =>
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const validateMandatory = () => {
    if (!selectedRound) return 'Please select a round';
    if (!strengths.trim()) return 'Strengths are mandatory';
    if (!concerns.trim()) return 'Concerns are mandatory';
    if (!recommendation) return 'Recommendation is mandatory';
    return '';
  };

  const submitEvaluation = async () => {
    const v = validateMandatory();
    if (v) {
      setError(v);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const feedback = [
        `Recommendation: ${recommendation}`,
        `Checklist Score: ${checklistScore}`,
        `Final Score: ${finalScore}`,
        '',
        `Strengths: ${strengths.trim()}`,
        `Concerns: ${concerns.trim()}`,
        '',
        `Checklist:`,
        `- Joined on time: ${checks.joinedOnTime ? 'Yes' : 'No'}`,
        `- Introduction clarity: ${checks.introClarity ? 'Yes' : 'No'}`,
        `- DS/Algo understanding: ${checks.dsAlgo ? 'Yes' : 'No'}`,
        `- System design thinking: ${checks.systemDesign ? 'Yes' : 'No'}`,
        `- Debugging approach: ${checks.debugging ? 'Yes' : 'No'}`,
        `- Communication clarity: ${checks.communication ? 'Yes' : 'No'}`,
        `- Culture alignment: ${checks.cultureFit ? 'Yes' : 'No'}`,
        `- Confidence: ${checks.confidence ? 'Yes' : 'No'}`,
      ].join('\n');

      await interviewApi.submitRoundResult(selectedRound!.id, {
        result: suggestedResult as 'pass' | 'fail',
        score: finalScore,
        feedback,
      });

      await interviewApi.updateStage(interviewId, suggestedStage);

      alert('Evaluation submitted successfully.');
      await load();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to submit evaluation'));
    } finally {
      setSaving(false);
    }
  };

  const quickStage = async (stage: InterviewStage) => {
    try {
      setSaving(true);
      await interviewApi.updateStage(interviewId, stage);
      await load();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to update stage'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={styles.page}><div style={styles.muted}>Loading live interview panel…</div></main>;
  }

  if (!detail) {
    return <main style={styles.page}><div style={styles.error}>Interview not found</div></main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Live Interview Panel</h1>
          <div style={styles.muted}>
            Interview ID: <code>{detail.interview.id}</code>
          </div>
          <div style={{ ...styles.muted, marginTop: 4 }}>
            Current Stage: <strong style={{ color: '#38BDF8' }}>{detail.interview.current_stage}</strong> · Status Code: {detail.interview.status_code}
          </div>
        </div>

        <div style={styles.topActions}>
          <button style={styles.secondaryBtn} onClick={() => router.push('/recruiter/interviews')}>
            Back
          </button>
          <button style={styles.secondaryBtn} onClick={() => void quickStage('INTERVIEW_IN_PROGRESS')} disabled={saving}>
            Mark In Progress
          </button>
          <button style={styles.secondaryBtn} onClick={() => void quickStage('ON_HOLD')} disabled={saving}>
            Put On Hold
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.grid}>
        {/* LEFT: Round + meeting + checklist */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Round Evaluation</h2>

          <label style={styles.label}>Select Round</label>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            style={styles.select}
          >
            {detail.rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round {r.round_number} · {r.round_type.toUpperCase()} · {r.result ?? 'pending'}
              </option>
            ))}
          </select>

          {selectedRound && (
            <div style={styles.roundMeta}>
              <div><strong>Scheduled:</strong> {selectedRound.scheduled_at ? new Date(selectedRound.scheduled_at).toLocaleString() : 'Not scheduled'}</div>
              <div><strong>Mode:</strong> {selectedRound.mode ?? '-'}</div>
              <div><strong>Duration:</strong> {selectedRound.duration_mins ?? '-'} mins</div>
              {selectedRound.meeting_join_url && (
                <a
                  href={selectedRound.meeting_join_url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.joinLink}
                >
                  Open Interview Room
                </a>
              )}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <h3 style={styles.h3}>Real Hiring Checklist</h3>
            <div style={styles.checkGrid}>
              <CheckRow label="Candidate joined on time" checked={checks.joinedOnTime} onChange={() => toggle('joinedOnTime')} />
              <CheckRow label="Introduction clarity" checked={checks.introClarity} onChange={() => toggle('introClarity')} />
              <CheckRow label="DS/Algo understanding" checked={checks.dsAlgo} onChange={() => toggle('dsAlgo')} />
              <CheckRow label="System design thinking" checked={checks.systemDesign} onChange={() => toggle('systemDesign')} />
              <CheckRow label="Debugging approach" checked={checks.debugging} onChange={() => toggle('debugging')} />
              <CheckRow label="Communication clarity" checked={checks.communication} onChange={() => toggle('communication')} />
              <CheckRow label="Culture alignment" checked={checks.cultureFit} onChange={() => toggle('cultureFit')} />
              <CheckRow label="Confidence" checked={checks.confidence} onChange={() => toggle('confidence')} />
            </div>
          </div>
        </section>

        {/* RIGHT: Final recommendation + notes + audit */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Decision Notes</h2>

          <label style={styles.label}>Strengths (mandatory)</label>
          <textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Write key strengths observed..."
            style={styles.textarea}
          />

          <label style={styles.label}>Concerns (mandatory)</label>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Write key concerns / gaps..."
            style={styles.textarea}
          />

          <label style={styles.label}>Hire Recommendation (mandatory)</label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as 'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire')}
            style={styles.select}
          >
            <option>Strong Hire</option>
            <option>Hire</option>
            <option>No Hire</option>
            <option>Strong No Hire</option>
          </select>

          <div style={styles.scoreBox}>
            <div>Checklist Score: <strong>{checklistScore}</strong></div>
            <div>Final Score: <strong>{finalScore}</strong></div>
            <div>Suggested Result: <strong>{suggestedResult.toUpperCase()}</strong></div>
            <div>Suggested Stage: <strong>{suggestedStage}</strong></div>
          </div>

          <button style={styles.primaryBtn} onClick={() => void submitEvaluation()} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Evaluation & Update Stage'}
          </button>

          <div style={{ marginTop: 16 }}>
            <h3 style={styles.h3}>Recent Timeline</h3>
            <div style={styles.timeline}>
              {detail.events?.length ? (
                detail.events.slice(0, 12).map((e) => (
                  <div key={e.id} style={styles.timelineItem}>
                    <div style={{ fontWeight: 600 }}>{e.event_type}</div>
                    <div style={styles.mutedSmall}>
                      {e.from_stage ? `${e.from_stage} → ` : ''}{e.to_stage ?? '-'} · {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.muted}>No events yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
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

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={styles.checkRow}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
  },
  muted: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  mutedSmall: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  topActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  card: {
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10,
    background: 'rgba(255,255,255,.02)',
    padding: 14,
  },
  h2: {
    margin: '0 0 10px',
    fontSize: 16,
    fontWeight: 700,
  },
  h3: {
    margin: '0 0 8px',
    fontSize: 14,
    fontWeight: 700,
  },
  label: {
    display: 'block',
    fontSize: 12,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 600,
  },
  select: {
    width: '100%',
    borderRadius: 8,
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    padding: '9px 10px',
    marginBottom: 10,
  },
  textarea: {
    width: '100%',
    minHeight: 90,
    resize: 'vertical',
    borderRadius: 8,
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    padding: 10,
    marginBottom: 10,
    fontFamily: 'inherit',
  },
  roundMeta: {
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    display: 'grid',
    gap: 6,
    background: 'rgba(56,189,248,.05)',
  },
  joinLink: {
    color: '#38BDF8',
    fontWeight: 700,
    textDecoration: 'none',
  },
  checkGrid: {
    display: 'grid',
    gap: 8,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,.015)',
  },
  scoreBox: {
    marginTop: 8,
    marginBottom: 10,
    border: '1px solid rgba(167,139,250,.25)',
    background: 'rgba(167,139,250,.07)',
    borderRadius: 8,
    padding: 10,
    display: 'grid',
    gap: 4,
    fontSize: 13,
  },
  primaryBtn: {
    width: '100%',
    border: 'none',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#22C55E',
    color: '#05240f',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    border: '1px solid rgba(255,255,255,.2)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,.04)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
  timeline: {
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    maxHeight: 240,
    overflowY: 'auto',
    padding: 8,
    display: 'grid',
    gap: 8,
  },
  timelineItem: {
    borderBottom: '1px dashed rgba(255,255,255,.12)',
    paddingBottom: 6,
  },
  error: {
    color: '#F87171',
  },
  errorBox: {
    marginBottom: 10,
    border: '1px solid rgba(248,113,113,.4)',
    background: 'rgba(248,113,113,.12)',
    color: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
};
