'use client';

import { useState } from 'react';

const MINDPAL_URL = 'https://chatbot.getmindpal.com/mock-interview-master-7ia?theme=dark';

export default function MockInterviewPage() {
  const [started, setStarted] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

        /* ── Reset any layout constraints from parent wrappers ── */
        /* The protected layout may have padding/overflow that clips the iframe */
        .mi-root {
          font-family:    'Sora', sans-serif;
          background:     #070B14;
          color:          #E2E8F0;
          display:        flex;
          flex-direction: column;

          /* Fill the full viewport minus whatever the sidebar takes */
          height:         100vh;
          overflow:       hidden;   /* prevent double scrollbars */
        }

        /* ── Header — fixed height so iframe gets the rest ── */
        .mi-header {
          display:         flex;
          align-items:     center;
          justify-content: space-between;
          padding:         1rem 1.75rem;
          border-bottom:   1px solid rgba(255,255,255,0.06);
          background:      #070B14;
          flex-shrink:     0;          /* never compress — iframe gets remaining space */
          height:          64px;
          box-sizing:      border-box;
          z-index:         10;
        }

        /* ── Main: fills everything below the header ── */
        .mi-main {
          flex:       1;
          display:    flex;
          flex-direction: column;
          min-height: 0;             /* critical — lets flex child shrink below content size */
          overflow:   hidden;
        }

        /* ── Landing screen ── */
        .mi-landing {
          flex:            1;
          display:         flex;
          flex-direction:  column;
          align-items:     center;
          justify-content: center;
          padding:         3rem 2rem;
          text-align:      center;
          animation:       miUp 0.5s ease forwards;
        }

        /* ── Iframe wrapper: fills main, no padding when active ── */
        .mi-iframe-container {
          flex:       1;
          display:    flex;
          flex-direction: column;
          min-height: 0;
          padding:    0;             /* zero padding — iframe goes edge to edge */
          animation:  miUp 0.35s ease forwards;
        }

        /* ── The iframe itself ── */
        .mi-iframe {
          flex:    1;
          width:   100%;
          border:  none;
          display: block;
          /* No fixed height — flex:1 makes it fill all available space */
          min-height: 0;
        }

        /* ── CTA button ── */
        .mi-btn {
          background:    linear-gradient(135deg, #6366F1, #8B5CF6);
          border:        none;
          border-radius: 14px;
          color:         #fff;
          cursor:        pointer;
          font-family:   'Sora', sans-serif;
          font-size:     15px;
          font-weight:   600;
          padding:       14px 40px;
          transition:    transform 0.15s, box-shadow 0.15s;
          box-shadow:    0 4px 24px rgba(99,102,241,0.3);
        }
        .mi-btn:hover {
          transform:  translateY(-2px);
          box-shadow: 0 8px 32px rgba(99,102,241,0.45);
        }

        /* ── Animations ── */
        @keyframes miUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        /* ── Feature pill ── */
        .mi-pill {
          display:      flex;
          align-items:  center;
          gap:          7px;
          padding:      7px 14px;
          background:   rgba(255,255,255,0.03);
          border:       1px solid rgba(255,255,255,0.07);
          border-radius:20px;
          font-size:    12px;
          color:        rgba(255,255,255,0.45);
          transition:   all 0.2s;
        }
        .mi-pill:hover {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.25);
          color: rgba(255,255,255,0.7);
        }
      `}</style>

      <div className="mi-root">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mi-header">

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Icon */}
            <div style={{
              width:          '38px',
              height:         '38px',
              borderRadius:   '10px',
              background:     'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              border:         '1px solid rgba(99,102,241,0.3)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '18px',
              flexShrink:     0,
            }}>
              🎤
            </div>

            <div>
              <h1 style={{
                fontSize:      '15px',
                fontWeight:     600,
                color:         '#F1F5F9',
                margin:         0,
                letterSpacing: '-0.02em',
              }}>
                Mock Interview
              </h1>
              <p style={{
                fontSize: '12px',
                color:    'rgba(255,255,255,0.3)',
                margin:    0,
              }}>
                AI-powered practice session
              </p>
            </div>
          </div>

          {/* Right side — status when active, tips when idle */}
          {started ? (
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '7px',
              padding:      '5px 14px',
              background:   'rgba(16,185,129,0.08)',
              border:       '1px solid rgba(16,185,129,0.2)',
              borderRadius: '20px',
              fontSize:     '12px',
              color:        '#6EE7B7',
              fontFamily:   'monospace',
            }}>
              <span style={{
                width:        '7px',
                height:       '7px',
                borderRadius: '50%',
                background:   '#10B981',
                display:      'inline-block',
                animation:    'pulse 1.5s ease infinite',
              }} />
              Session active
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              color:    'rgba(255,255,255,0.2)',
              display:  'flex',
              gap:      '1rem',
            }}>
              <span>🎯 Role-specific questions</span>
              <span>⚡ Instant feedback</span>
            </div>
          )}
        </header>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main id="main-content" className="mi-main">

          {/* ── Landing — before session starts ─────────────────────────── */}
          {!started && (
            <div className="mi-landing">

              {/* Hero icon */}
              <div style={{
                width:          '80px',
                height:         '80px',
                borderRadius:   '22px',
                background:     'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
                border:         '1px solid rgba(99,102,241,0.22)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '36px',
                marginBottom:   '2rem',
              }}>
                🎯
              </div>

              <h2 style={{
                fontSize:      'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight:     700,
                color:         '#F1F5F9',
                letterSpacing: '-0.03em',
                lineHeight:     1.15,
                margin:        '0 0 1rem',
                maxWidth:      '540px',
              }}>
                Ace your next interview with{' '}
                <span style={{
                  background:           'linear-gradient(135deg, #818CF8, #A78BFA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor:  'transparent',
                }}>
                  AI coaching
                </span>
              </h2>

              <p style={{
                fontSize:     '15px',
                color:        'rgba(255,255,255,0.4)',
                lineHeight:    1.7,
                maxWidth:     '460px',
                margin:       '0 0 2.5rem',
              }}>
                Practice with a real AI interviewer. Get instant feedback on your
                answers, communication, and technical depth — anytime, for free.
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
                  { icon: '🎤', label: 'Voice Support'      },
                ].map(f => (
                  <div key={f.label} className="mi-pill">
                    <span aria-hidden="true">{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>

              <button
                className="mi-btn"
                onClick={() => setStarted(true)}
                aria-label="Start mock interview session"
              >
                Start Interview Session →
              </button>

              <p style={{
                marginTop: '1.25rem',
                fontSize:  '12px',
                color:     'rgba(255,255,255,0.18)',
              }}>
                Powered by MindPal AI · No account required
              </p>
            </div>
          )}

          {/* ── Active session — MindPal iframe fills entire remaining space ── */}
          {started && (
            <div className="mi-iframe-container">
              <iframe
                className="mi-iframe"
                src={MINDPAL_URL}
                title="Mock Interview AI Agent"
                allow="microphone; camera"
                loading="lazy"
              />
            </div>
          )}

        </main>
      </div>
    </>
  );
}