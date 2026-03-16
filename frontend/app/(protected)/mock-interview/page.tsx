'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

const MINDPAL_URL = 'https://chatbot.getmindpal.com/mock-interview-master-7ia?theme=dark';

export default function MockInterviewPage() {
  const { user }            = useAuth();
  const [started, setStarted] = useState(false);

  return (
    <div style={{
      fontFamily:  "'Sora', sans-serif",
      background:  '#070B14',
      minHeight:   '100vh',
      color:       '#E2E8F0',
      display:     'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }

        .mi-animate { animation: fadeUp 0.5s ease forwards; }

        .mi-start-btn {
          background:    linear-gradient(135deg, #6366F1, #8B5CF6);
          border:        none;
          border-radius: 14px;
          color:         #fff;
          cursor:        pointer;
          font-family:   'Sora', sans-serif;
          font-size:     15px;
          font-weight:   600;
          padding:       14px 36px;
          transition:    transform 0.15s, box-shadow 0.15s;
          box-shadow:    0 4px 24px rgba(99,102,241,0.3);
        }
        .mi-start-btn:hover {
          transform:  translateY(-2px);
          box-shadow: 0 8px 32px rgba(99,102,241,0.45);
        }

        .mi-iframe-wrap {
          animation:    fadeUp 0.4s ease forwards;
          border-radius: 16px;
          overflow:      hidden;
          border:        1px solid rgba(255,255,255,0.08);
          box-shadow:    0 0 0 1px rgba(99,102,241,0.15),
                         0 24px 64px rgba(0,0,0,0.4);
          flex:          1;
          min-height:    0;
        }

        .mi-iframe-wrap iframe {
          display: block;
          width:   100%;
          height:  100%;
          border:  none;
        }

        /* Loading skeleton shimmer */
        .mi-skeleton {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 25%,
            rgba(255,255,255,0.07) 50%,
            rgba(255,255,255,0.03) 75%
          );
          background-size: 600px 100%;
          animation: shimmer 1.8s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '1.25rem 2rem',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Icon */}
          <div style={{
            width:        '36px',
            height:       '36px',
            borderRadius: '10px',
            background:   'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border:       '1px solid rgba(99,102,241,0.3)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '18px',
          }}>
            🎤
          </div>

          <div>
            <h1 style={{
              fontSize:      '16px',
              fontWeight:     600,
              color:         '#F1F5F9',
              margin:         0,
              letterSpacing: '-0.02em',
            }}>
              Mock Interview
            </h1>
            <p style={{
              fontSize: '12px',
              color:    'rgba(255,255,255,0.35)',
              margin:    0,
            }}>
              AI-powered practice session
            </p>
          </div>
        </div>

        {/* Live indicator — only shown when interview is active */}
        {started && (
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '7px',
            padding:      '5px 12px',
            background:   'rgba(16,185,129,0.08)',
            border:       '1px solid rgba(16,185,129,0.2)',
            borderRadius: '20px',
            fontSize:     '12px',
            color:        '#6EE7B7',
            fontFamily:   'monospace',
          }}>
            <span style={{
              width:      '7px',
              height:     '7px',
              borderRadius: '50%',
              background: '#10B981',
              display:    'inline-block',
              animation:  'pulse 1.5s ease infinite',
            }} />
            Session active
          </div>
        )}
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main
        id="main-content"
        style={{
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
          padding:       started ? '1rem 1.5rem 1.5rem' : '0',
          minHeight:     0,
          position:      'relative',
        }}
      >

        {/* ── Landing state — shown before user starts ─────────────────────── */}
        {!started && (
          <div
            className="mi-animate"
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              padding:        '3rem 2rem',
              textAlign:      'center',
            }}
          >
            {/* Hero icon */}
            <div style={{
              width:        '80px',
              height:       '80px',
              borderRadius: '24px',
              background:   'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
              border:       '1px solid rgba(99,102,241,0.25)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     '36px',
              marginBottom: '1.75rem',
            }}>
              🎯
            </div>

            <h2 style={{
              fontSize:      'clamp(1.6rem, 4vw, 2.25rem)',
              fontWeight:     700,
              color:         '#F1F5F9',
              letterSpacing: '-0.03em',
              lineHeight:     1.2,
              margin:        '0 0 1rem',
              maxWidth:      '520px',
            }}>
              Practice interviews with{' '}
              <span style={{
                background:           'linear-gradient(135deg, #818CF8, #A78BFA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
              }}>
                AI precision
              </span>
            </h2>

            <p style={{
              fontSize:     '15px',
              color:        'rgba(255,255,255,0.45)',
              lineHeight:    1.7,
              maxWidth:     '480px',
              margin:       '0 0 2.5rem',
            }}>
              Get real-time feedback on your answers, communication style,
              and technical depth. Practice as many times as you need — completely free.
            </p>

            {/* Feature pills */}
            <div style={{
              display:        'flex',
              gap:            '10px',
              flexWrap:       'wrap',
              justifyContent: 'center',
              marginBottom:   '2.5rem',
            }}>
              {[
                { icon: '🤖', label: 'AI Interviewer'     },
                { icon: '⚡', label: 'Instant Feedback'   },
                { icon: '🎯', label: 'Role-Specific'      },
                { icon: '🔄', label: 'Unlimited Practice' },
              ].map(f => (
                <div key={f.label} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '7px',
                  padding:      '7px 14px',
                  background:   'rgba(255,255,255,0.03)',
                  border:       '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px',
                  fontSize:     '12px',
                  color:        'rgba(255,255,255,0.5)',
                }}>
                  <span aria-hidden="true">{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              className="mi-start-btn"
              onClick={() => setStarted(true)}
              aria-label="Start mock interview session"
            >
              Start Interview Session →
            </button>

            <p style={{
              marginTop: '1rem',
              fontSize:  '12px',
              color:     'rgba(255,255,255,0.2)',
            }}>
              Powered by MindPal AI · No account required
            </p>
          </div>
        )}

        {/* ── Active interview — MindPal iframe ───────────────────────────── */}
        {started && (
          <div
            className="mi-iframe-wrap"
            style={{ flex: 1 }}
          >
            <iframe
              src={MINDPAL_URL}
              title="Mock Interview AI Agent"
              allow="microphone; camera"
              loading="lazy"
            />
          </div>
        )}
      </main>
    </div>
  );
}