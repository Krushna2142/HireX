/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts';
import { useRecruiterJobs } from '@/features/jobs/hooks/useJobs';
import { useRecruiterRealtime } from '@/hooks/useRecruiterPlatform';
import Sidebar from '@/app/_components/shared/Sidebar';

// ─────────────────────────────────────────────────────────────────────────────
// Role-specific realtime components
// Isolated so hooks only activate for the correct role — prevents
// unnecessary Supabase channel subscriptions for wrong role
// ─────────────────────────────────────────────────────────────────────────────

function CandidateRealtime() {
  useRealTimeAlerts();
  return null;
}

function RecruiterRealtime() {
  const { data: jobs = [] } = useRecruiterJobs();
  const jobIds = (jobs as any[]).map(j => j.id);
  useRecruiterRealtime(jobIds);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading screen
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      style={{
        background:     '#070B14',
        height:         '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexDirection:  'column',
        gap:            '16px',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Spinner */}
      <div
        style={{
          width:        '36px',
          height:       '36px',
          border:       '2px solid rgba(255,255,255,0.08)',
          borderTop:    '2px solid #38BDF8',
          borderRadius: '50%',
          animation:    'spin 0.8s linear infinite',
        }}
      />

      {/* Logo */}
      <div
        style={{
          animation:     'fadeIn 0.4s ease forwards',
          animationDelay:'0.2s',
          opacity:        0,
          textAlign:     'center',
        }}
      >
        <p
          style={{
            color:         '#38BDF8',
            fontSize:      '12px',
            fontWeight:    700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin:        0,
            fontFamily:    'monospace',
          }}
        >
          ⬡ JobCrawler
        </p>
        <p
          style={{
            color:    'rgba(255,255,255,0.25)',
            fontSize: '11px',
            margin:   '4px 0 0',
          }}
        >
          Loading your workspace…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected Layout
// Single auth boundary for all (protected) routes.
// Architectural decision: one layout handles both candidate and recruiter
// zones — role-specific logic is pushed into page-level components,
// keeping routing concerns separate from display concerns.
// ─────────────────────────────────────────────────────────────────────────────

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router            = useRouter();
  const queryClient       = useQueryClient();

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!loading && !user) {
      // Clear any stale query cache before redirecting
      queryClient.clear();
      router.replace('/');
    }
  }, [user, loading, router, queryClient]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  // ── Not authenticated — return null while redirect fires ─────────────────

  if (!user) return null;

  // ── Authenticated — render full shell ────────────────────────────────────

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #070B14;
          color: #E2E8F0;
          font-family: 'Sora', 'Segoe UI', sans-serif;
        }

        /* Scrollbar styling — consistent with dark theme */
        ::-webkit-scrollbar       { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

        /* Smooth page transitions */
        .page-content {
          animation: pageIn 0.25s ease forwards;
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Input focus ring — global */
        input:focus,
        textarea:focus,
        select:focus {
          outline: none;
          border-color: rgba(56,189,248,0.5) !important;
          box-shadow: 0 0 0 3px rgba(56,189,248,0.08);
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }

        select option {
          background: #0D1424;
          color: #F1F5F9;
        }

        /* Recruiter role — shift focus ring to pink */
        body[data-role="recruiter"] input:focus,
        body[data-role="recruiter"] textarea:focus,
        body[data-role="recruiter"] select:focus {
          border-color: rgba(244,114,182,0.5) !important;
          box-shadow: 0 0 0 3px rgba(244,114,182,0.08);
        }
      `}</style>

      {/* Set role on body for global CSS targeting */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.body.setAttribute('data-role', '${user.role}')`,
        }}
      />

      {/* Mount realtime subscription — invisible, role-gated */}
      {user.role === 'candidate' && <CandidateRealtime />}
      {user.role === 'recruiter' && <RecruiterRealtime />}

      {/* Shell */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar — always visible in protected zone */}
        <Sidebar />

        {/* Main content area */}
        <main
          className="page-content"
          style={{
            marginLeft:  '220px',
            flex:         1,
            minHeight:   '100vh',
            background:  '#070B14',
            overflowX:   'hidden',
            // Sidebar collapses to 60px — CSS var keeps this in sync
            // If you wire sidebar collapsed state to context, update here
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}