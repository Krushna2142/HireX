/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'SETUP' | 'IN_PROGRESS' | 'REVIEWING' | 'COMPLETE';

type SessionType = 'technical' | 'behavioral' | 'system_design';

interface Question {
  id:             string;
  questionNumber: number;
  question:       string;
  category:       string;
  difficulty:     'easy' | 'medium' | 'hard';
}

interface EvaluatedQuestion extends Question {
  userAnswer:   string;
  score:        number;
  feedback:     string;
  idealAnswer:  string;
  timeTaken:    number;
  evaluation: {
    score:        number;
    feedback:     string;
    strengths:    string[];
    improvements: string[];
  };
}

interface Session {
  id:            string;
  jobTitle:      string;
  company:       string;
  sessionType:   SessionType;
  totalQuestions:number;
  status:        string;
}

interface SessionSummary {
  session:   Session & { overallScore: number };
  questions: EvaluatedQuestion[];
  summary: {
    totalQuestions:  number;
    answered:        number;
    averageScore:    number;
    scoreBreakdown: {
      excellent:  number;
      good:       number;
      adequate:   number;
      needsWork:  number;
    };
    byCategory: { category: string; averageScore: number }[];
  };
}

interface PastSession {
  id:            string;
  jobTitle:      string;
  company:       string;
  sessionType:   string;
  overallScore:  number;
  totalQuestions:number;
  answered:      string;
  completedAt:   string;
  createdAt:     string;
  status:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT  = '#A78BFA';
const BG      = '#070B14';
const CARD    = '#0D1117';
const BORDER  = 'rgba(167,139,250,0.15)';

const DIFF_COLOR: Record<string, string> = {
  easy:   '#10B981',
  medium: '#F59E0B',
  hard:   '#F87171',
};

const CAT_COLOR: Record<string, string> = {
  technical:     '#38BDF8',
  behavioral:    '#F472B6',
  system_design: '#A78BFA',
  coding:        '#34D399',
};

const SESSION_TYPES: { value: SessionType; label: string; icon: string; desc: string }[] = [
  { value: 'technical',     label: 'Technical',     icon: '⚙️', desc: 'DS&A, language-specific, frameworks' },
  { value: 'behavioral',    label: 'Behavioral',    icon: '🧠', desc: 'STAR format, leadership, teamwork'   },
  { value: 'system_design', label: 'System Design', icon: '🏗️', desc: 'Scalability, architecture, trade-offs' },
];

function scoreColor(score: number): string {
  if (score >= 90) return '#10B981';
  if (score >= 70) return '#38BDF8';
  if (score >= 50) return '#F59E0B';
  return '#F87171';
}

// ─────────────────────────────────────────────────────────────────────────────
// Timer hook
// ─────────────────────────────────────────────────────────────────────────────

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const ref                   = useRef(0);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  function reset() { setSeconds(0); }

  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return { seconds, display, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r    = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - score / 100);
  const col  = scoreColor(score);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={col} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={fill}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{
        position:  'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', textAlign: 'center',
      }}>
        <span style={{ fontSize: size > 70 ? '18px' : '13px', fontWeight: 700, color: col, fontFamily: 'monospace' }}>
          {score}
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', display: 'block' }}>%</span>
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span style={{
      fontSize:     '10px',
      padding:      '2px 8px',
      borderRadius: '4px',
      fontWeight:    600,
      fontFamily:   'monospace',
      background:   `${DIFF_COLOR[difficulty] || '#888'}18`,
      color:         DIFF_COLOR[difficulty] || '#888',
      border:       `1px solid ${DIFF_COLOR[difficulty] || '#888'}33`,
      textTransform: 'capitalize',
    }}>
      {difficulty}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CAT_COLOR[category] || '#94A3B8';
  return (
    <span style={{
      fontSize:     '10px',
      padding:      '2px 8px',
      borderRadius: '4px',
      fontWeight:    500,
      background:   `${color}18`,
      color,
      border:       `1px solid ${color}33`,
      textTransform: 'capitalize',
    }}>
      {category.replace('_', ' ')}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: SETUP
// ─────────────────────────────────────────────────────────────────────────────

interface SetupPhaseProps {
  onStart:     (session: Session, questions: Question[]) => void;
  pastSessions: PastSession[];
  loadingHistory: boolean;
}

function SetupPhase({ onStart, pastSessions, loadingHistory }: SetupPhaseProps) {
  const [jobTitle,     setJobTitle]     = useState('');
  const [company,      setCompany]      = useState('');
  const [sessionType,  setSessionType]  = useState<SessionType>('technical');
  const [loading,      setLoading]      = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim()) { toast.error('Enter a job title to continue'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/interviews/sessions', {
        jobTitle: jobTitle.trim(),
        company:  company.trim() || 'a tech company',
        sessionType,
      });
      toast.success('Interview session ready 🎯');
      onStart(data.session, data.questions);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    padding:      '11px 14px',
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color:        '#F1F5F9',
    fontSize:     '13px',
    outline:      'none',
    fontFamily:   'inherit',
    transition:   'border-color 0.15s',
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>
          Mock Interview
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          AI generates role-specific questions and evaluates your answers in real-time
        </p>
      </div>

      {/* Session config form */}
      <form onSubmit={handleStart}>
        <div style={{
          background:   CARD,
          border:       `1px solid ${BORDER}`,
          borderRadius: '16px',
          padding:      '1.75rem',
          marginBottom: '1rem',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1.25rem' }}>
            Configure Your Session
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{
                display:       'block',
                fontSize:      '11px',
                fontWeight:    600,
                color:         'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom:  '6px',
              }}>
                Job Title *
              </label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{
                display:       'block',
                fontSize:      '11px',
                fontWeight:    600,
                color:         'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom:  '6px',
              }}>
                Company (optional)
              </label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Razorpay, Google"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Session type selector */}
          <div>
            <label style={{
              display:       'block',
              fontSize:      '11px',
              fontWeight:    600,
              color:         'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom:  '10px',
            }}>
              Interview Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {SESSION_TYPES.map(t => {
                const selected = sessionType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSessionType(t.value)}
                    style={{
                      padding:      '14px',
                      borderRadius: '12px',
                      border:       selected
                        ? `2px solid ${ACCENT}66`
                        : '2px solid rgba(255,255,255,0.07)',
                      background:   selected
                        ? `${ACCENT}12`
                        : 'rgba(255,255,255,0.03)',
                      textAlign:    'left',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>{t.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9', marginBottom: '4px' }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          type="submit"
          disabled={loading || !jobTitle.trim()}
          style={{
            width:        '100%',
            padding:      '14px',
            background:   loading || !jobTitle.trim()
              ? 'rgba(167,139,250,0.3)'
              : `linear-gradient(135deg, #7C3AED, ${ACCENT})`,
            border:       'none',
            borderRadius: '12px',
            color:        '#fff',
            fontSize:     '15px',
            fontWeight:    700,
            cursor:       loading || !jobTitle.trim() ? 'not-allowed' : 'pointer',
            transition:   'opacity 0.15s',
            fontFamily:   'inherit',
            display:      'flex',
            alignItems:   'center',
            justifyContent:'center',
            gap:           '10px',
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px', height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              Generating questions with AI…
            </>
          ) : (
            <>🎤 Start Interview Session</>
          )}
        </button>
      </form>

      {/* Past sessions */}
      {!loadingHistory && pastSessions.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Past Sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pastSessions.slice(0, 5).map(s => (
              <div key={s.id} style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '12px 16px',
                background:     CARD,
                border:         '1px solid rgba(255,255,255,0.06)',
                borderRadius:   '10px',
                gap:            '12px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.jobTitle}
                    {s.company && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> @ {s.company}</span>}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                    {s.sessionType} · {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {s.overallScore != null && (
                  <div style={{
                    fontSize:   '14px',
                    fontWeight:  700,
                    color:       scoreColor(s.overallScore),
                    fontFamily: 'monospace',
                    flexShrink:  0,
                  }}>
                    {s.overallScore}%
                  </div>
                )}
                <span style={{
                  fontSize:     '10px',
                  padding:      '3px 8px',
                  borderRadius: '6px',
                  background:   s.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  color:        s.status === 'completed' ? '#10B981' : '#F59E0B',
                  flexShrink:    0,
                }}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: IN_PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

interface InProgressPhaseProps {
  session:     Session;
  questions:   Question[];
  currentIdx:  number;
  onSubmit:    (questionId: string, answer: string, timeTaken: number) => Promise<void>;
  onAbandon:   () => void;
  submitting:  boolean;
}

function InProgressPhase({
  session, questions, currentIdx, onSubmit, onAbandon, submitting,
}: InProgressPhaseProps) {
  const [answer, setAnswer]   = useState('');
  const { seconds, display, reset } = useTimer(!submitting);
  const q                     = questions[currentIdx];
  const progress              = ((currentIdx) / questions.length) * 100;
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when question changes
  useEffect(() => {
    setAnswer('');
    reset();
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [currentIdx]);

  async function handleSubmit() {
    if (!answer.trim()) { toast.error('Write something before submitting'); return; }
    await onSubmit(q.id, answer.trim(), seconds);
  }

  if (!q) return null;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

      {/* Top bar — session info + progress */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   '1.5rem',
        flexWrap:       'wrap',
        gap:            '10px',
      }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9', margin: 0 }}>
            {session.jobTitle}
            {session.company && (
              <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> @ {session.company}</span>
            )}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', textTransform: 'capitalize' }}>
            {session.sessionType.replace('_', ' ')} Interview
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Timer */}
          <div style={{
            padding:      '6px 14px',
            background:   seconds > 120 ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
            border:       `1px solid ${seconds > 120 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px',
            fontFamily:   'monospace',
            fontSize:     '14px',
            fontWeight:    600,
            color:        seconds > 120 ? '#F87171' : '#F1F5F9',
            transition:   'all 0.3s',
          }}>
            ⏱ {display}
          </div>

          {/* Question counter */}
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: ACCENT, fontWeight: 700, fontFamily: 'monospace' }}>
              {currentIdx + 1}
            </span>
            <span> / {questions.length}</span>
          </span>

          <button
            onClick={onAbandon}
            style={{
              padding:      '6px 12px',
              background:   'none',
              border:       '1px solid rgba(248,113,113,0.25)',
              borderRadius: '8px',
              color:        'rgba(248,113,113,0.7)',
              fontSize:     '12px',
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
          >
            End
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height:       '3px',
        background:   'rgba(255,255,255,0.06)',
        borderRadius: '99px',
        overflow:     'hidden',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          width:        `${progress}%`,
          height:       '100%',
          background:   `linear-gradient(90deg, #7C3AED, ${ACCENT})`,
          borderRadius: '99px',
          transition:   'width 0.4s ease',
        }} />
      </div>

      {/* Question card */}
      <div style={{
        background:   CARD,
        border:       `1px solid ${BORDER}`,
        borderRadius: '16px',
        padding:      '1.75rem',
        marginBottom: '1rem',
      }}>
        {/* Question metadata */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <CategoryBadge category={q.category} />
          <DifficultyBadge difficulty={q.difficulty} />
          <span style={{
            fontSize:  '11px',
            color:     'rgba(255,255,255,0.2)',
            padding:   '2px 0',
            marginLeft:'auto',
          }}>
            Question {q.questionNumber} of {questions.length}
          </span>
        </div>

        {/* Question text */}
        <p style={{
          fontSize:   '16px',
          fontWeight:  500,
          color:      '#F1F5F9',
          lineHeight:  1.65,
          margin:     '0 0 1.5rem',
        }}>
          {q.question}
        </p>

        {/* Answer textarea */}
        <div>
          <label style={{
            display:       'block',
            fontSize:      '11px',
            fontWeight:    600,
            color:         'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom:  '8px',
          }}>
            Your Answer
          </label>
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here… Be specific and use concrete examples where possible."
            rows={8}
            style={{
              width:        '100%',
              padding:      '12px 14px',
              background:   'rgba(255,255,255,0.04)',
              border:       '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color:        '#F1F5F9',
              fontSize:     '13px',
              lineHeight:    1.7,
              resize:       'vertical',
              outline:      'none',
              fontFamily:   'inherit',
              minHeight:    '160px',
              transition:   'border-color 0.15s',
              boxSizing:    'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginTop:      '8px',
          }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
              {answer.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <span style={{ fontSize: '11px', color: answer.length < 50 ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}>
              {answer.length < 50 ? 'Aim for at least 50 words for a good evaluation' : '✓ Good length'}
            </span>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !answer.trim()}
        style={{
          width:          '100%',
          padding:        '14px',
          background:     submitting || !answer.trim()
            ? 'rgba(167,139,250,0.25)'
            : `linear-gradient(135deg, #7C3AED, ${ACCENT})`,
          border:         'none',
          borderRadius:   '12px',
          color:          '#fff',
          fontSize:       '14px',
          fontWeight:      600,
          cursor:         submitting || !answer.trim() ? 'not-allowed' : 'pointer',
          transition:     'opacity 0.15s',
          fontFamily:     'inherit',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:             '10px',
        }}
      >
        {submitting ? (
          <>
            <div style={{
              width: '16px', height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid #fff',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            Evaluating with AI…
          </>
        ) : (
          `Submit Answer ${currentIdx + 1 < questions.length ? '→' : '& Complete'}`
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: REVIEWING
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewingPhaseProps {
  evaluated:   EvaluatedQuestion;
  currentIdx:  number;
  totalCount:  number;
  onContinue:  () => void;
}

function ReviewingPhase({ evaluated: q, currentIdx, totalCount, onContinue }: ReviewingPhaseProps) {
  const isLast = currentIdx + 1 >= totalCount;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

      {/* Result header */}
      <div style={{
        display:     'flex',
        alignItems:  'flex-start',
        gap:         '1.25rem',
        marginBottom:'1.5rem',
        padding:     '1.5rem',
        background:   CARD,
        border:      `1px solid ${BORDER}`,
        borderRadius: '16px',
      }}>
        <ScoreRing score={q.score} size={76} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: scoreColor(q.score) }}>
              {q.score >= 90 ? 'Exceptional' : q.score >= 70 ? 'Good answer' : q.score >= 50 ? 'Adequate' : 'Needs work'}
            </span>
            <CategoryBadge category={q.category} />
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
            {q.evaluation.feedback}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Strengths */}
        {q.evaluation.strengths?.length > 0 && (
          <div style={{
            padding:     '1.25rem',
            background:   'rgba(16,185,129,0.06)',
            border:      '1px solid rgba(16,185,129,0.2)',
            borderRadius: '12px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ✓ Strengths
            </p>
            {q.evaluation.strengths.map((s, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '0 0 6px', lineHeight: 1.5 }}>
                · {s}
              </p>
            ))}
          </div>
        )}

        {/* Improvements */}
        {q.evaluation.improvements?.length > 0 && (
          <div style={{
            padding:      '1.25rem',
            background:   'rgba(245,158,11,0.06)',
            border:       '1px solid rgba(245,158,11,0.2)',
            borderRadius: '12px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ↑ Improve
            </p>
            {q.evaluation.improvements.map((s, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '0 0 6px', lineHeight: 1.5 }}>
                · {s}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Your answer vs ideal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
        <div style={{
          padding:     '1.25rem',
          background:   CARD,
          border:      '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Your Answer
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
            {q.userAnswer}
          </p>
        </div>

        <div style={{
          padding:     '1.25rem',
          background:  `${ACCENT}08`,
          border:      `1px solid ${ACCENT}25`,
          borderRadius: '12px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: ACCENT, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Ideal Benchmark
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.6 }}>
            {q.idealAnswer}
          </p>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        style={{
          width:          '100%',
          padding:        '14px',
          background:     `linear-gradient(135deg, #7C3AED, ${ACCENT})`,
          border:         'none',
          borderRadius:   '12px',
          color:          '#fff',
          fontSize:       '14px',
          fontWeight:      600,
          cursor:         'pointer',
          fontFamily:     'inherit',
          transition:     'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        {isLast ? 'View Final Report →' : `Next Question (${currentIdx + 2}/${totalCount}) →`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase: COMPLETE
// ─────────────────────────────────────────────────────────────────────────────

function CompletePhase({
  summary, onNewSession,
}: {
  summary: SessionSummary;
  onNewSession: () => void;
}) {
  const { summary: s, session, questions } = summary;
  const avg = s.averageScore;

  const verdict =
    avg >= 90 ? { label: 'Exceptional Performance',    color: '#10B981', icon: '🏆' } :
    avg >= 70 ? { label: 'Strong Performance',          color: '#38BDF8', icon: '🎯' } :
    avg >= 50 ? { label: 'Room for Improvement',        color: '#F59E0B', icon: '📈' } :
               { label: 'Keep Practicing',              color: '#F87171', icon: '💪' };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>

      {/* Header result card */}
      <div style={{
        background:    CARD,
        border:        `1px solid ${BORDER}`,
        borderRadius:  '20px',
        padding:       '2rem',
        marginBottom:  '1rem',
        textAlign:     'center',
        position:      'relative',
        overflow:      'hidden',
      }}>
        <div style={{
          position:   'absolute',
          top:        '-40px',
          left:       '50%',
          transform:  'translateX(-50%)',
          width:      '200px',
          height:     '200px',
          borderRadius:'50%',
          background: `radial-gradient(circle, ${verdict.color}10 0%, transparent 70%)`,
          pointerEvents:'none',
        }} />

        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{verdict.icon}</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: verdict.color, margin: '0 0 6px' }}>
          {verdict.label}
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 1.5rem' }}>
          {session.jobTitle}
          {session.company && ` @ ${session.company}`} · {session.sessionType.replace('_', ' ')}
        </p>

        {/* Score ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ScoreRing score={avg} size={100} />
        </div>

        {/* Score breakdown grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {[
            { label: 'Excellent',  count: s.scoreBreakdown.excellent,  color: '#10B981' },
            { label: 'Good',       count: s.scoreBreakdown.good,       color: '#38BDF8' },
            { label: 'Adequate',   count: s.scoreBreakdown.adequate,   color: '#F59E0B' },
            { label: 'Needs Work', count: s.scoreBreakdown.needsWork,  color: '#F87171' },
          ].map(item => (
            <div key={item.label} style={{
              padding:      '12px',
              background:   `${item.color}0A`,
              border:       `1px solid ${item.color}22`,
              borderRadius: '10px',
            }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: item.color, fontFamily: 'monospace', lineHeight: 1 }}>
                {item.count}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-question breakdown */}
      <div style={{
        background:   CARD,
        border:       `1px solid rgba(255,255,255,0.06)`,
        borderRadius: '16px',
        padding:      '1.5rem',
        marginBottom: '1rem',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1rem' }}>
          Question Breakdown
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(questions as unknown as EvaluatedQuestion[]).map((q, i) => (
            <div key={q.id} style={{
              display:     'flex',
              alignItems:  'flex-start',
              gap:         '12px',
              padding:     '12px',
              background:  'rgba(255,255,255,0.02)',
              borderRadius:'10px',
              border:      '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{
                fontSize:     '11px',
                fontFamily:   'monospace',
                color:        'rgba(255,255,255,0.25)',
                paddingTop:   '2px',
                flexShrink:    0,
              }}>
                Q{i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '0 0 6px', lineHeight: 1.5 }}>
                  {q.question}
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <CategoryBadge category={q.category} />
                  <DifficultyBadge difficulty={q.difficulty} />
                </div>
              </div>
              {q.score != null && (
                <ScoreRing score={q.score} size={44} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Category performance */}
      {s.byCategory?.length > 0 && (
        <div style={{
          background:   CARD,
          border:       '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding:      '1.5rem',
          marginBottom: '1rem',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 1rem' }}>
            Performance by Category
          </h3>
          {s.byCategory.map(cat => (
            <div key={cat.category} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                  {cat.category.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: scoreColor(cat.averageScore), fontFamily: 'monospace' }}>
                  {cat.averageScore}%
                </span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  width:        `${cat.averageScore}%`,
                  height:       '100%',
                  background:    scoreColor(cat.averageScore),
                  borderRadius: '99px',
                  transition:   'width 0.8s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onNewSession}
          style={{
            flex:         1,
            padding:      '13px',
            background:   `linear-gradient(135deg, #7C3AED, ${ACCENT})`,
            border:       'none',
            borderRadius: '12px',
            color:        '#fff',
            fontSize:     '14px',
            fontWeight:    600,
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Start New Session
        </button>
        <button
          onClick={() => window.print()}
          style={{
            padding:      '13px 20px',
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color:        'rgba(255,255,255,0.6)',
            fontSize:     '14px',
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Save Report
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page — state machine orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export default function MockInterviewPage() {
  const [phase,        setPhase]        = useState<Phase>('SETUP');
  const [session,      setSession]      = useState<Session | null>(null);
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [evaluated,    setEvaluated]    = useState<EvaluatedQuestion | null>(null);
  const [summary,      setSummary]      = useState<SessionSummary | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load past sessions on mount
  useEffect(() => {
    api.get('/interviews/sessions')
      .then(r => setPastSessions(r.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  // ── Transition: SETUP → IN_PROGRESS ───────────────────────────────────────
  function handleSessionStart(sess: Session, qs: Question[]) {
    setSession(sess);
    setQuestions(qs);
    setCurrentIdx(0);
    setEvaluated(null);
    setSummary(null);
    setPhase('IN_PROGRESS');
  }

  // ── Transition: IN_PROGRESS → REVIEWING ───────────────────────────────────
  async function handleAnswerSubmit(questionId: string, answer: string, timeTaken: number) {
    if (!session) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(
        `/interviews/questions/${questionId}/answer`,
        { answer, timeTakenSecs: timeTaken },
      );
      setEvaluated({ ...questions[currentIdx], ...data, userAnswer: answer, timeTaken });
      setPhase('REVIEWING');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Evaluation failed');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Transition: REVIEWING → IN_PROGRESS or COMPLETE ───────────────────────
  async function handleContinue() {
    if (!session) return;
    const nextIdx = currentIdx + 1;

    if (nextIdx >= questions.length) {
      // All questions answered — complete session
      try {
        const { data } = await api.post(`/interviews/sessions/${session.id}/complete`);
        setSummary(data);
        setPhase('COMPLETE');
      } catch {
        toast.error('Failed to complete session');
      }
    } else {
      setCurrentIdx(nextIdx);
      setEvaluated(null);
      setPhase('IN_PROGRESS');
    }
  }

  // ── Transition: any → SETUP ────────────────────────────────────────────────
  function handleReset() {
    setPhase('SETUP');
    setSession(null);
    setQuestions([]);
    setCurrentIdx(0);
    setEvaluated(null);
    setSummary(null);
    // Refresh history
    api.get('/interviews/sessions')
      .then(r => setPastSessions(r.data))
      .catch(() => {});
  }

  return (
    <div style={{
      fontFamily: "'Sora', 'Segoe UI', sans-serif",
      background:  BG,
      minHeight:  '100vh',
      padding:    '2rem',
      color:      '#E2E8F0',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        textarea::placeholder { color: rgba(255,255,255,0.2) !important; }
        input::placeholder    { color: rgba(255,255,255,0.2) !important; }
      `}</style>

      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        {phase === 'SETUP' && (
          <SetupPhase
            onStart={handleSessionStart}
            pastSessions={pastSessions}
            loadingHistory={loadingHistory}
          />
        )}

        {phase === 'IN_PROGRESS' && session && (
          <InProgressPhase
            session={session}
            questions={questions}
            currentIdx={currentIdx}
            onSubmit={handleAnswerSubmit}
            onAbandon={handleReset}
            submitting={submitting}
          />
        )}

        {phase === 'REVIEWING' && evaluated && (
          <ReviewingPhase
            evaluated={evaluated}
            currentIdx={currentIdx}
            totalCount={questions.length}
            onContinue={handleContinue}
          />
        )}

        {phase === 'COMPLETE' && summary && (
          <CompletePhase
            summary={summary}
            onNewSession={handleReset}
          />
        )}
      </div>
    </div>
  );
}