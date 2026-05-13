'use client';

// ─────────────────────────────────────────────────────────────────────────────
// _components/shared/Sidebar.tsx
//
// Final routing decision:
//   Candidate:
//     /dashboard            → candidate overview
//     /jobs                 → candidate job discovery
//     /resumes              → resume manager
//     /resume-analysis      → AI resume analysis
//     /interviews           → candidate interviews
//
//   Recruiter:
//     /dashboard            → recruiter/company profile overview
//     /recruiter/dashboard  → recruitment command center
//     /recruiter/interviews → interview rooms/live interview workflow
//
// Settings lives inside ProfilePanel drawer.
// Username card opens ProfilePanel instead of navigating.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useResumeAnalysis } from '@/hooks/useAnalyseResume';
import type { AnalysisState } from '@/hooks/useAnalyseResume';
import ResumeAnalysisTab from '@/components/resumes/ResumeAnalysisTab';
import { useAlerts } from '@/hooks/useRealTimeAlerts';
import { useProfilePanel } from '@/components/context/ProfilePanelContext';

// ─────────────────────────────────────────────────────────────────────────────
// Nav definitions
// ─────────────────────────────────────────────────────────────────────────────

const CANDIDATE_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
      { href: '/jobs', icon: '💼', label: 'Jobs' },
      { href: '/resumes', icon: '📄', label: 'Resume' },
      { href: '/resume-analysis', icon: '🧠', label: 'AI Analysis' },
      { href: '/interviews', icon: '🎥', label: 'Interviews' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { href: '/recommendations', icon: '🎯', label: 'Recommendations' },
      { href: '/mock-interview', icon: '🎤', label: 'Mock Interview' },
    ],
  },
] as const;

const RECRUITER_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Overview' },
      { href: '/recruiter/dashboard', icon: '📊', label: 'Recruitment' },
      { href: '/recruiter/interviews', icon: '🎥', label: 'Interviews' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// AI Analyse button states
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyseBtnCfg {
  label: string;
  sublabel: string;
  disabled: boolean;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

const ANALYSE_CFG: Record<AnalysisState, AnalyseBtnCfg> = {
  idle: {
    label: 'No resume yet',
    sublabel: 'Upload a resume first',
    disabled: true,
    icon: '📄',
    color: 'rgba(255,255,255,0.15)',
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
  },
  uploaded: {
    label: 'Analyse Resume',
    sublabel: 'Run AI analysis on your CV',
    disabled: false,
    icon: '⚡',
    color: '#A78BFA',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.25)',
  },
  triggering: {
    label: 'Starting…',
    sublabel: 'Queuing analysis job',
    disabled: true,
    icon: '⚡',
    color: '#A78BFA',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.25)',
  },
  processing: {
    label: 'Analysing…',
    sublabel: 'Gemini is reading your resume',
    disabled: true,
    icon: '⚡',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.06)',
    border: 'rgba(56,189,248,0.2)',
  },
  analyzed: {
    label: 'Analysis complete',
    sublabel: 'Resume fully analysed ✓',
    disabled: true,
    icon: '✓',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.2)',
  },
  failed: {
    label: 'Retry Analysis',
    sublabel: 'Previous attempt failed',
    disabled: false,
    icon: '↺',
    color: '#F87171',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.2)',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        border: `2px solid ${color}33`,
        borderTopColor: color,
        animation: 'sbSpin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

function ResumeAnalysisSection() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        margin: '4px 0',
      }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'Sora, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🧠</span>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              Resume Analysis
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 1,
              }}
            >
              Upload, analyse, get matched
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.25)',
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        >
          ▾
        </span>
      </button>

      <div
        style={{
          maxHeight: open ? 600 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{ padding: '0 8px 12px' }}>
          <style>
            {`.sb-ap .text-gray-800,.sb-ap .text-gray-900{color:rgba(255,255,255,.85)!important}.sb-ap .text-gray-500,.sb-ap .text-gray-600{color:rgba(255,255,255,.4)!important}.sb-ap .border-gray-200{border-color:rgba(255,255,255,.08)!important}.sb-ap .bg-white,.sb-ap .bg-gray-50{background:rgba(255,255,255,.03)!important}.sb-ap .rounded-xl{border-radius:10px!important}`}
          </style>
          <div className="sb-ap">
            <ResumeAnalysisTab />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecruiterStats() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('jc_recruiter_stats');
    if (!raw) return null;

    const s = JSON.parse(raw) as {
      activeJobs: number;
      newApplicants: number;
    };

    if (!s.activeJobs && !s.newApplicants) return null;

    return (
      <div
        style={{
          margin: '2px 10px 6px',
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(244,114,182,0.07)',
          border: '1px solid rgba(244,114,182,0.18)',
          display: 'flex',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#F472B6',
              lineHeight: 1,
            }}
          >
            {s.activeJobs}
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            active
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#38BDF8',
              lineHeight: 1,
            }}
          >
            {s.newApplicants}
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            applicants
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { openPanel } = useProfilePanel();

  const {
    analysisState = 'idle',
    canAnalyse = false,
    trigger,
    error,
  } = useResumeAnalysis();

  const { unreadCount = 0 } = useAlerts();

  const isCandidate = user?.role === 'candidate';
  const isRecruiter = user?.role === 'recruiter';

  const navGroups = isCandidate ? CANDIDATE_NAV : RECRUITER_NAV;
  const cfg = ANALYSE_CFG[analysisState] ?? ANALYSE_CFG.idle;
  const isSpinning =
    analysisState === 'triggering' || analysisState === 'processing';

  const initial =
    user?.full_name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    'U';

  return (
    <>
      <style>{`
        @keyframes sbSpin  { to { transform: rotate(360deg); } }
        @keyframes sbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .sb-root {
          width: 240px;
          height: 100vh;
          position: sticky;
          top: 0;
          background: #0D1117;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          font-family: 'Sora', sans-serif;
        }

        .sb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .sb-logo-mark {
          font-size: 18px;
          font-weight: 800;
          color: #38BDF8;
        }

        .sb-logo-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
        }

        .sb-nav {
          flex: 1;
          padding: .5rem .75rem 0;
          overflow-y: auto;
          min-height: 0;
        }

        .sb-nav::-webkit-scrollbar {
          width: 3px;
        }

        .sb-nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.08);
          border-radius: 2px;
        }

        .sb-grp {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: rgba(255,255,255,.2);
          padding: 0 .5rem;
          margin: .6rem 0 .3rem;
        }

        .sb-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 2px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          color: rgba(255,255,255,.45);
          border: 1px solid transparent;
          transition: all .15s;
          position: relative;
        }

        .sb-link:hover {
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.8);
        }

        .sb-link.ac {
          background: rgba(56,189,248,.08);
          color: #38BDF8;
          border-color: rgba(56,189,248,.15);
        }

        .sb-link.ar {
          background: rgba(244,114,182,.08);
          color: #F472B6;
          border-color: rgba(244,114,182,.15);
        }

        .sb-icon {
          font-size: 15px;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .sb-badge {
          margin-left: auto;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: rgba(167,139,250,.2);
          color: #A78BFA;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(167,139,250,.3);
        }

        .sb-ai {
          padding: .75rem;
          border-top: 1px solid rgba(255,255,255,.05);
          flex-shrink: 0;
        }

        .sb-ai-btn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .15s;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          border: 1px solid;
        }

        .sb-ai-btn:hover:not(:disabled) {
          filter: brightness(1.15);
          transform: translateY(-1px);
        }

        .sb-ai-btn:disabled {
          cursor: default;
        }

        .sb-ai-lbl {
          display: block;
          line-height: 1.3;
        }

        .sb-ai-sub {
          display: block;
          font-size: 10px;
          font-weight: 400;
          opacity: .6;
          margin-top: 1px;
        }

        .sb-ai-err {
          font-size: 11px;
          color: #FCA5A5;
          padding: 4px 2px 0;
          line-height: 1.4;
        }

        .sb-rec-cta {
          margin: .5rem .75rem .25rem;
          padding: 10px;
          border-radius: 10px;
          text-decoration: none;
          background: rgba(244,114,182,.08);
          border: 1px solid rgba(244,114,182,.2);
          color: #F472B6;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all .15s;
          flex-shrink: 0;
        }

        .sb-rec-cta:hover {
          background: rgba(244,114,182,.14);
        }

        .sb-foot {
          padding: .75rem;
          border-top: 1px solid rgba(255,255,255,.07);
          flex-shrink: 0;
        }

        .sb-ucard {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          transition: all .15s;
          width: 100%;
          text-align: left;
          font-family: 'Sora', sans-serif;
        }

        .sb-ucard:hover {
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.13);
        }

        .sb-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(135deg,#6366F1,#8B5CF6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }

        .sb-uinfo {
          flex: 1;
          min-width: 0;
        }

        .sb-uname {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-urole {
          font-size: 10px;
          color: rgba(255,255,255,.3);
          text-transform: capitalize;
          margin-top: 1px;
        }

        .sb-uhint {
          font-size: 9px;
          color: rgba(255,255,255,.18);
          margin-top: 2px;
        }

        .sb-logout {
          background: none;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          color: rgba(255,255,255,.22);
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
          transition: color .15s;
          line-height: 1;
        }

        .sb-logout:hover {
          color: #F87171;
        }
      `}</style>

      <aside className="sb-root" aria-label="Sidebar navigation">
        <div className="sb-logo">
          <span className="sb-logo-mark">⬡</span>
          <span className="sb-logo-name">JobCrawler</span>
        </div>

        <nav className="sb-nav">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className="sb-grp">{group.label}</div>

              {group.items.map((item) => {
                const exactDashboard =
                  item.href === '/dashboard' && pathname === '/dashboard';

                const exactRecruitment =
                  item.href === '/recruiter/dashboard' &&
                  pathname === '/recruiter/dashboard';

                const nestedActive =
                  item.href !== '/dashboard' &&
                  item.href !== '/recruiter/dashboard' &&
                  pathname.startsWith(item.href);

                const active =
                  exactDashboard || exactRecruitment || nestedActive;

                const cls = active ? (isRecruiter ? 'ar' : 'ac') : '';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sb-link ${cls}`}
                  >
                    <span className="sb-icon">{item.icon}</span>
                    {item.label}

                    {item.href === '/alerts' && unreadCount > 0 && (
                      <span className="sb-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}

              {isRecruiter && groupIndex === 0 && <RecruiterStats />}
              {isCandidate && groupIndex === 0 && <ResumeAnalysisSection />}
            </div>
          ))}
        </nav>

        {isCandidate && (
          <div className="sb-ai">
            <div className="sb-grp" style={{ marginBottom: 8 }}>
              AI Tools
            </div>

            <button
              className="sb-ai-btn"
              onClick={canAnalyse ? () => void trigger() : undefined}
              disabled={cfg.disabled}
              style={{
                background: cfg.bg,
                borderColor: cfg.border,
                color: cfg.color,
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {isSpinning ? <Spinner color={cfg.color} /> : cfg.icon}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="sb-ai-lbl">{cfg.label}</span>
                <span className="sb-ai-sub">{cfg.sublabel}</span>
              </div>

              {analysisState === 'processing' && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#38BDF8',
                    flexShrink: 0,
                    animation: 'sbPulse 1.5s ease infinite',
                  }}
                />
              )}
            </button>

            {error && analysisState === 'failed' && (
              <p className="sb-ai-err">{error}</p>
            )}

            <Link
              href="/resume-analysis"
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: 11,
                color: 'rgba(255,255,255,.22)',
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              View full analysis →
            </Link>
          </div>
        )}

        {isRecruiter && (
          <Link href="/recruiter/dashboard" className="sb-rec-cta">
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            Recruitment Center
          </Link>
        )}

        {user && (
          <div className="sb-foot">
            <div
              className="sb-ucard"
              onClick={openPanel}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openPanel();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Open profile and settings"
              title="Profile & Settings"
            >
              <div className="sb-avatar" aria-hidden="true">
                {initial}
              </div>

              <div className="sb-uinfo">
                <div className="sb-uname">{user.full_name ?? user.email}</div>
                <div className="sb-urole">{user.role}</div>
                <div className="sb-uhint">Profile &amp; Settings →</div>
              </div>

              <button
                type="button"
                className="sb-logout"
                onClick={(event) => {
                  event.stopPropagation();
                  logout();
                }}
                aria-label="Log out"
                title="Log out"
              >
                ⏻
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;