'use client';

import Link             from 'next/link';
import { useState }     from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth }      from '@/components/providers/AuthProvider';
import { useResumeAnalysis, AnalysisState } from '@/hooks/useAnalyseResume';
import ResumeAnalysisTab from '@/components/resumes/ResumeAnalysisTab';

// ── Nav structure — split into named groups ───────────────────────────────────

const CANDIDATE_NAV_GROUPS = [
  {
    label: 'Menu',
    items: [
      { href: '/dashboard',       icon: '⊞', label: 'Dashboard' },
      { href: '/jobs',            icon: '💼', label: 'Jobs'      },
      { href: '/resumes',         icon: '📄', label: 'Resume'    },
    ],
  },
  // ← Resume Analysis section injected here (see below)
  {
    label: 'Discover',
    items: [
      { href: '/recommendations', icon: '🎯', label: 'Recommendations' },
      { href: '/mock-interview',  icon: '🎤', label: 'Mock Interview'  },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/alerts',   icon: '🔔', label: 'Alerts'   },
      { href: '/settings', icon: '⚙',  label: 'Settings' },
    ],
  },
] as const;

const RECRUITER_NAV_GROUPS = [
  {
    label: 'Menu',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
      { href: '/jobs',      icon: '💼', label: 'Jobs'      },
      { href: '/settings',  icon: '⚙',  label: 'Settings'  },
    ],
  },
] as const;

// ── Analyse button config ─────────────────────────────────────────────────────

interface AnalyseBtnConfig {
  label: string; sublabel: string; disabled: boolean;
  color: string; bg: string; border: string; icon: string;
}

const ANALYSE_CONFIG: Record<AnalysisState, AnalyseBtnConfig> = {
  idle: {
    label: 'No resume yet', sublabel: 'Upload a resume first',
    disabled: true, icon: '📄',
    color: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)',
  },
  uploaded: {
    label: 'Analyse Resume', sublabel: 'Run AI analysis on your CV',
    disabled: false, icon: '⚡',
    color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)',
  },
  triggering: {
    label: 'Starting…', sublabel: 'Queuing analysis job',
    disabled: true, icon: '⚡',
    color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)',
  },
  processing: {
    label: 'Analysing…', sublabel: 'AI is reading your resume',
    disabled: true, icon: '⚡',
    color: '#38BDF8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)',
  },
  analyzed: {
    label: 'Analysis complete', sublabel: 'Resume fully analysed ✓',
    disabled: true, icon: '✓',
    color: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)',
  },
  failed: {
    label: 'Retry Analysis', sublabel: 'Previous attempt failed',
    disabled: false, icon: '↺',
    color: '#F87171', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)',
  },
};

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: '12px', height: '12px',
      borderRadius: '50%', border: `2px solid ${color}33`,
      borderTopColor: color, animation: 'sbSpin 0.7s linear infinite', flexShrink: 0,
    }} />
  );
}

// ── Resume Analysis inline section ────────────────────────────────────────────

function ResumeAnalysisSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderTop:    '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      margin:       '4px 0',
    }}>
      {/* Section header — toggles the panel */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 12px',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          fontFamily:     'Sora, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🧠</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
              Resume Analysis
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
              Upload, analyse, get matched
            </div>
          </div>
        </div>

        {/* Chevron — rotates when expanded */}
        <span style={{
          fontSize:         '10px',
          color:            'rgba(255,255,255,0.25)',
          transform:        expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition:       'transform 0.2s ease',
          display:          'inline-block',
        }}>
          ▾
        </span>
      </button>

      {/* Collapsible panel */}
      <div style={{
        maxHeight:  expanded ? '600px' : '0px',
        overflow:   'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{
          padding:    '0 8px 12px',
          // Scoped overrides so ResumeAnalysisTab renders well on dark bg
        }}>
          <style>{`
            .sb-analysis-panel .text-gray-800,
            .sb-analysis-panel .text-gray-900 { color: rgba(255,255,255,0.85) !important; }
            .sb-analysis-panel .text-gray-500,
            .sb-analysis-panel .text-gray-600 { color: rgba(255,255,255,0.4) !important; }
            .sb-analysis-panel .text-gray-400 { color: rgba(255,255,255,0.3) !important; }
            .sb-analysis-panel .border-gray-200 { border-color: rgba(255,255,255,0.08) !important; }
            .sb-analysis-panel .bg-white       { background: rgba(255,255,255,0.04) !important; }
            .sb-analysis-panel .bg-gray-50     { background: rgba(255,255,255,0.03) !important; }
            .sb-analysis-panel .bg-gray-100    { background: rgba(255,255,255,0.06) !important; }
            .sb-analysis-panel .rounded-xl     { border-radius: 10px !important; }
            .sb-analysis-panel .text-sm        { font-size: 12px !important; }
            .sb-analysis-panel .text-xs        { font-size: 11px !important; }
          `}</style>

          <div className="sb-analysis-panel">
            <ResumeAnalysisTab />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main sidebar component ────────────────────────────────────────────────────

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname         = usePathname();
  const router           = useRouter();

  const { analysisState, canAnalyse, trigger, error } = useResumeAnalysis();

  const isCandidate    = user?.role === 'candidate';
  const navGroups      = isCandidate ? CANDIDATE_NAV_GROUPS : RECRUITER_NAV_GROUPS;
  const cfg            = ANALYSE_CONFIG[analysisState];
  const isSpinning     = analysisState === 'triggering' || analysisState === 'processing';
  const avatarInitial  = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <>
      <style>{`
        @keyframes sbSpin  { to { transform: rotate(360deg); } }
        @keyframes sbPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .sb-root {
          width: 240px; min-height: 100vh;
          background: #0D1117;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          font-family: 'Sora', sans-serif;
          flex-shrink: 0;
        }
        .sb-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .sb-logo-mark { font-size: 18px; font-weight: 800; color: #38BDF8; letter-spacing: 0.06em; }
        .sb-logo-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }

        .sb-nav { flex: 1; padding: 0.5rem 0.75rem 0; overflow-y: auto; }

        .sb-section-label {
          font-size: 10px; font-weight: 600;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0 0.5rem;
          margin: 0.6rem 0 0.3rem;
        }
        .sb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px;
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          transition: all 0.15s;
          margin-bottom: 2px;
          border: 1px solid transparent;
        }
        .sb-nav-item:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
        .sb-nav-item.active { background: rgba(56,189,248,0.08); color: #38BDF8; border-color: rgba(56,189,248,0.15); }
        .sb-nav-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }

        .sb-analyse-wrap {
          padding: 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          margin: 0.5rem 0;
        }
        .sb-analyse-btn {
          width: 100%; padding: 10px 12px; border-radius: 10px;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.15s ease;
          display: flex; align-items: center; gap: 10px;
          text-align: left; border: 1px solid;
        }
        .sb-analyse-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
        .sb-analyse-btn:disabled { cursor: default; }
        .sb-analyse-text  { flex: 1; min-width: 0; }
        .sb-analyse-label { display: block; line-height: 1.3; }
        .sb-analyse-sub   { display: block; font-size: 10px; font-weight: 400; opacity: 0.6; margin-top: 1px; }
        .sb-analyse-error { font-size: 11px; color: #FCA5A5; padding: 4px 2px 0; line-height: 1.4; }

        .sb-user { padding: 0.75rem; flex-shrink: 0; }
        .sb-user-card {
          display: flex; align-items: center; gap: 10px;
          padding: 10px; border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer; transition: all 0.15s;
        }
        .sb-user-card:hover { background: rgba(255,255,255,0.06); }
        .sb-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg,#6366F1,#8B5CF6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
        }
        .sb-user-info  { flex: 1; min-width: 0; }
        .sb-user-name  { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-user-role  { font-size: 10px; color: rgba(255,255,255,0.3); text-transform: capitalize; }
        .sb-logout-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.25); font-size: 14px;
          padding: 4px; border-radius: 4px; transition: color 0.15s; line-height: 1;
        }
        .sb-logout-btn:hover { color: #F87171; }

        /* Sidebar scrollbar */
        .sb-nav::-webkit-scrollbar       { width: 4px; }
        .sb-nav::-webkit-scrollbar-track { background: transparent; }
        .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      <aside className="sb-root" aria-label="Sidebar navigation">

        {/* Logo */}
        <div className="sb-logo">
          <span className="sb-logo-mark">⬡</span>
          <span className="sb-logo-name">JobCrawler</span>
        </div>

        {/* Navigation — grouped with section labels */}
        <nav className="sb-nav" aria-label="Main navigation">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              <div className="sb-section-label">{group.label}</div>

              {group.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sb-nav-item${pathname === item.href ? ' active' : ''}`}
                >
                  <span className="sb-nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              {/* Inject Resume Analysis panel after the first group (after Resume) */}
              {isCandidate && gi === 0 && (
                <ResumeAnalysisSection />
              )}
            </div>
          ))}
        </nav>

        {/* Analyse button — quick trigger without opening the panel */}
        {isCandidate && (
          <div className="sb-analyse-wrap">
            <div className="sb-section-label" style={{ padding: '0 0.25rem', marginBottom: '0.5rem' }}>
              AI Tools
            </div>
            <button
              className="sb-analyse-btn"
              onClick={canAnalyse ? () => { void trigger(); } : undefined}
              disabled={cfg.disabled}
              aria-label={cfg.label}
              aria-busy={isSpinning}
              style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {isSpinning ? <Spinner color={cfg.color} /> : cfg.icon}
              </span>
              <div className="sb-analyse-text">
                <span className="sb-analyse-label">{cfg.label}</span>
                <span className="sb-analyse-sub">{cfg.sublabel}</span>
              </div>
              {analysisState === 'processing' && (
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#38BDF8', flexShrink: 0,
                  animation: 'sbPulse 1.5s ease infinite',
                }} aria-hidden="true" />
              )}
            </button>
            {error && analysisState === 'failed' && (
              <p className="sb-analyse-error" role="alert">{error}</p>
            )}
          </div>
        )}

        {/* User card */}
        {user && (
          <div className="sb-user">
            <div
              className="sb-user-card"
              onClick={() => router.push('/profile')}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && router.push('/profile')}
              aria-label="Go to profile"
            >
              <div className="sb-avatar" aria-hidden="true">{avatarInitial}</div>
              <div className="sb-user-info">
                <div className="sb-user-name">{user.full_name ?? user.email}</div>
                <div className="sb-user-role">{user.role}</div>
              </div>
              <button
                className="sb-logout-btn"
                onClick={e => { e.stopPropagation(); logout(); }}
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