/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/no-unescaped-entities */
// frontend/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';
import { roleRedirectPath } from '@/lib/auth';

export default function LandingPage() {
  const { user, loading }   = useAuth();
  const searchParams        = useSearchParams();
  const router              = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-open modal if redirected from protected route
  useEffect(() => {
    if (searchParams.get('auth') === 'login') {
      setModalOpen(true);
    }
  }, [searchParams]);

  // Redirect authenticated users straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace(roleRedirectPath(user.role));
    }
  }, [user, loading, router]);

  if (loading) return null;
  if (user)    return null; // avoid flash before redirect

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070B14; }
      `}</style>

      <div style={{
        fontFamily:  "'Sora', sans-serif",
        background:  '#070B14',
        minHeight:   '100vh',
        color:       '#E2E8F0',
        overflow:    'hidden',
      }}>

        {/* ── Ambient background ─────────────────────────────────────── */}
        <div style={{
          position:  'fixed',
          inset:      0,
          zIndex:     0,
          pointerEvents: 'none',
        }}>
          <div style={{
            position:  'absolute',
            top:       '-20%',
            left:      '-10%',
            width:     '600px',
            height:    '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)',
          }} />
          <div style={{
            position:  'absolute',
            bottom:    '-20%',
            right:     '-10%',
            width:     '500px',
            height:    '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
          }} />
        </div>

        {/* ── Minimal header — NO NAV, just logo + CTA ───────────────── */}
        <header style={{
          position:       'relative',
          zIndex:          10,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '1.25rem 2.5rem',
          borderBottom:   '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontSize:      '14px',
            fontWeight:     700,
            color:         '#38BDF8',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            ⬡ JobCrawler
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding:      '8px 20px',
                background:   'transparent',
                border:       '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color:        'rgba(255,255,255,0.7)',
                fontSize:     '13px',
                fontWeight:    500,
                cursor:       'pointer',
                transition:   'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)');
                (e.currentTarget.style.color = '#fff');
              }}
              onMouseLeave={e => {
                (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)');
                (e.currentTarget.style.color = 'rgba(255,255,255,0.7)');
              }}
            >
              Sign In
            </button>

            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding:      '8px 20px',
                background:   'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                border:       'none',
                borderRadius: '8px',
                color:        '#fff',
                fontSize:     '13px',
                fontWeight:    600,
                cursor:       'pointer',
                transition:   'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Get Started
            </button>
          </div>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <main style={{
          position:       'relative',
          zIndex:          10,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      'calc(100vh - 68px)',
          padding:        '4rem 2rem',
          textAlign:      'center',
        }}>

          {/* Badge */}
          <div style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           '8px',
            padding:       '6px 14px',
            background:    'rgba(56,189,248,0.08)',
            border:        '1px solid rgba(56,189,248,0.2)',
            borderRadius:  '20px',
            fontSize:      '12px',
            color:         '#38BDF8',
            marginBottom:  '2rem',
            fontWeight:     500,
            letterSpacing: '0.04em',
          }}>
            <span style={{
              width:        '6px',
              height:       '6px',
              borderRadius: '50%',
              background:   '#38BDF8',
              display:      'inline-block',
              animation:    'pulse 2s infinite',
            }} />
            AI-Powered Job Matching Platform
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:      'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight:     800,
            lineHeight:     1.1,
            letterSpacing: '-0.03em',
            color:         '#F1F5F9',
            marginBottom:  '1.25rem',
            maxWidth:      '900px',
          }}>
            Land Your Dream Job
            <br />
            <span style={{
              background:            'linear-gradient(135deg, #38BDF8, #818CF8)',
              WebkitBackgroundClip:  'text',
              WebkitTextFillColor:   'transparent',
            }}>
              With AI Precision
            </span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize:     'clamp(1rem, 2vw, 1.2rem)',
            color:        'rgba(255,255,255,0.45)',
            lineHeight:    1.7,
            maxWidth:     '580px',
            marginBottom: '2.5rem',
          }}>
            Upload your resume, get AI-matched to thousands of jobs,
            and track every application — all in one place.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding:      '14px 32px',
                background:   'linear-gradient(135deg, #0EA5E9, #38BDF8)',
                border:       'none',
                borderRadius: '12px',
                color:        '#fff',
                fontSize:     '15px',
                fontWeight:    700,
                cursor:       'pointer',
                transition:   'transform 0.15s, box-shadow 0.15s',
                boxShadow:    '0 4px 24px rgba(56,189,248,0.25)',
              }}
              onMouseEnter={e => {
                (e.currentTarget.style.transform = 'translateY(-2px)');
                (e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,0.35)');
              }}
              onMouseLeave={e => {
                (e.currentTarget.style.transform = 'translateY(0)');
                (e.currentTarget.style.boxShadow = '0 4px 24px rgba(56,189,248,0.25)');
              }}
            >
              Start for Free →
            </button>

            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding:      '14px 32px',
                background:   'rgba(255,255,255,0.04)',
                border:       '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color:        'rgba(255,255,255,0.7)',
                fontSize:     '15px',
                fontWeight:    500,
                cursor:       'pointer',
                transition:   'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget.style.background = 'rgba(255,255,255,0.08)');
                (e.currentTarget.style.color = '#fff');
              }}
              onMouseLeave={e => {
                (e.currentTarget.style.background = 'rgba(255,255,255,0.04)');
                (e.currentTarget.style.color = 'rgba(255,255,255,0.7)');
              }}
            >
              I'm a Recruiter
            </button>
          </div>

          {/* Social proof */}
          <p style={{
            fontSize:   '12px',
            color:      'rgba(255,255,255,0.2)',
            marginTop:  '1.5rem',
          }}>
            No credit card required · Free to get started
          </p>

          {/* Feature pills */}
          <div style={{
            display:       'flex',
            gap:           '10px',
            flexWrap:      'wrap',
            justifyContent:'center',
            marginTop:     '4rem',
          }}>
            {[
              { icon: '🤖', label: 'AI Resume Analysis' },
              { icon: '🎯', label: 'Smart Job Matching'  },
              { icon: '⚡', label: 'Real-Time Alerts'    },
              { icon: '🎤', label: 'Mock Interviews'     },
              { icon: '📊', label: 'Application Tracking'},
            ].map(f => (
              <div
                key={f.label}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '8px',
                  padding:      '8px 16px',
                  background:   'rgba(255,255,255,0.03)',
                  border:       '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px',
                  fontSize:     '12px',
                  color:        'rgba(255,255,255,0.5)',
                }}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </main>
      </div>

      <CredentialsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}