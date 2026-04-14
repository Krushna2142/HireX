// frontend/app/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';
import { roleRedirectPath } from '@/lib/auth';

function SearchParamsHandler({ onAuthParam }: { onAuthParam: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      onAuthParam();
      router.replace('/'); // remove query so logout doesn't keep reopening modal
    }
  }, [searchParams, onAuthParam, router]);

  return null;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(roleRedirectPath(user.role));
    }
  }, [user, loading, router]);

  // ✅ If authenticated, don't render the landing page at all.
  // The redirect above handles navigation — this prevents flash.
  if (!loading && user) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070B14; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-title  { animation: fadeUp 0.6s ease forwards; }
        .hero-sub    { animation: fadeUp 0.6s 0.1s ease both; }
        .hero-ctas   { animation: fadeUp 0.6s 0.2s ease both; }
        .hero-pills  { animation: fadeUp 0.6s 0.35s ease both; }

        /* Skip link — visible only on keyboard focus */
        .skip-link {
          position: absolute;
          top: -100%;
          left: 0;
          padding: 0.75rem 1.5rem;
          background: #0EA5E9;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          border-radius: 0 0 8px 0;
          z-index: 9999;
          transition: top 0.15s;
          text-decoration: none;
        }
        .skip-link:focus { top: 0; outline: 3px solid #38BDF8; }
      `}</style>

      {/* ✅ Skip link — keyboard accessibility companion to <main> */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Suspense fallback={null}>
        <SearchParamsHandler onAuthParam={() => setModalOpen(true)} />
      </Suspense>

      <div style={{
        fontFamily: "'Sora', sans-serif",
        background: '#070B14',
        minHeight: '100vh',
        color: '#E2E8F0',
        overflow: 'hidden',
      }}>

        {/* ── Ambient background glows ── */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-20%', left: '-10%',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', right: '-10%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
          }} />
        </div>

        {/* ✅ Semantic <header> with role="banner" */}
        <header role="banner" style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 2.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontSize: '14px', fontWeight: 700, color: '#38BDF8',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ⬡ JobCrawler
          </span>

          {/* ✅ nav landmark with accessible label */}
          <nav aria-label="Main navigation">
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setModalOpen(true)}
                aria-haspopup="dialog"
                style={{
                  padding: '8px 20px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                  color: 'rgba(255,255,255,0.7)', fontSize: '13px',
                  fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }}
              >
                Sign In
              </button>

              <button
                onClick={() => setModalOpen(true)}
                aria-haspopup="dialog"
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                  border: 'none', borderRadius: '8px',
                  color: '#fff', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Get Started
              </button>
            </div>
          </nav>
        </header>

        {/* ✅ <main> with id for skip link target — ALWAYS in DOM */}
        <main
          id="main-content"
          tabIndex={-1}           // allows skip link to focus it
          style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 68px)',
            padding: '4rem 2rem', textAlign: 'center',
          }}
        >
          {/* ✅ Loading state — skeleton keeps <main> populated */}
          {loading ? (
            <div
              aria-busy="true"
              aria-label="Loading"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}
            >
              {/* Minimal skeleton — matches hero proportions */}
              {[{ w: '280px', h: '28px' }, { w: '520px', h: '72px' }, { w: '400px', h: '40px' }].map((s, i) => (
                <div key={i} style={{
                  width: s.w, height: s.h, borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  animation: 'pulse 1.5s ease infinite',
                }} />
              ))}
            </div>
          ) : (
            <>
              {/* AI badge */}
              <div className="hero-title" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: '20px', fontSize: '12px', color: '#38BDF8',
                marginBottom: '2rem', fontWeight: 500, letterSpacing: '0.04em',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#38BDF8', display: 'inline-block',
                  animation: 'pulse 2s infinite',
                }} aria-hidden="true" />
                AI-Powered Job Matching Platform
              </div>

              {/* Headline */}
              <h1 className="hero-title" style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                fontWeight: 800, lineHeight: 1.1,
                letterSpacing: '-0.03em', color: '#F1F5F9',
                marginBottom: '1.25rem', maxWidth: '900px',
              }}>
                Land Your Dream Job
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, #38BDF8, #818CF8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  With AI Precision
                </span>
              </h1>

              {/* Sub */}
              <p className="hero-sub" style={{
                fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7, maxWidth: '580px', marginBottom: '2.5rem',
              }}>
                Upload your resume, get AI-matched to thousands of jobs,
                and track every application — all in one intelligent platform.
              </p>

              {/* CTAs */}
              <div className="hero-ctas" style={{
                display: 'flex', gap: '12px',
                flexWrap: 'wrap', justifyContent: 'center',
              }}>
                <button
                  onClick={() => setModalOpen(true)}
                  aria-haspopup="dialog"
                  style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                    border: 'none', borderRadius: '12px',
                    color: '#fff', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 4px 24px rgba(56,189,248,0.25)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(56,189,248,0.25)';
                  }}
                >
                  Start for Free →
                </button>

                <button
                  onClick={() => setModalOpen(true)}
                  aria-haspopup="dialog"
                  style={{
                    padding: '14px 32px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px', color: 'rgba(255,255,255,0.7)',
                    fontSize: '15px', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }}
                >
                  I&apos;m a Recruiter
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '1.25rem' }}>
                No credit card required · Free to get started
              </p>

              {/* Feature pills */}
              <div className="hero-pills" style={{
                display: 'flex', gap: '10px',
                flexWrap: 'wrap', justifyContent: 'center', marginTop: '4rem',
              }}>
                {[
                  { icon: '🤖', label: 'AI Resume Analysis' },
                  { icon: '🎯', label: 'Smart Job Matching' },
                  { icon: '⚡', label: 'Real-Time Alerts' },
                  { icon: '🎤', label: 'Mock Interviews' },
                  { icon: '📊', label: 'Application Tracking' },
                  { icon: '🏢', label: 'Recruiter Dashboard' },
                ].map(f => (
                  <div
                    key={f.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '20px', fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                    }}
                  >
                    <span aria-hidden="true">{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        {/* ✅ Semantic <footer> */}
        <footer role="contentinfo" style={{
          position: 'relative', zIndex: 10,
          textAlign: 'center', padding: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '12px', color: 'rgba(255,255,255,0.2)',
        }}>
          © {new Date().getFullYear()} JobCrawler · Built with AI
        </footer>
      </div>

      <CredentialsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
/*

---

## What Changed and Why

The core architectural shift is **separating structural HTML from conditional content**:
```
BEFORE                          AFTER
──────────────────────────      ──────────────────────────────────
loading=true → return null      loading=true → <main> with skeleton
loading=false → render page     loading=false → <main> with content

Lighthouse sees: empty DOM      Lighthouse sees: <main> always present
Result: no landmark found       Result: landmark audit passes ✅ */
