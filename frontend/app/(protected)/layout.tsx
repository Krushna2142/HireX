'use client';


// frontend/app/(protected)/layout.tsx

import { useEffect }          from 'react';
import { useRouter }          from 'next/navigation';
import { useAuth }            from '@/components/providers/AuthProvider';
import { Sidebar }            from '@/app/_components/shared/Sidebar';  // ✅ named import

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LayoutSkeleton() {
  return (
    <div style={{
      display:    'flex',
      minHeight:  '100vh',
      background: '#070B14',
    }}>
      {/* Sidebar skeleton */}
      <div style={{
        width:       '240px',
        minHeight:   '100vh',
        background:  '#0D1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink:  0,
      }} />
      {/* Content skeleton */}
      <div style={{ flex: 1, padding: '2rem' }}>
        <div style={{
          height:       '32px',
          width:        '200px',
          borderRadius: '8px',
          background:   'rgba(255,255,255,0.05)',
          marginBottom: '1rem',
          animation:    'skPulse 1.5s ease infinite',
        }} />
        <div style={{
          height:       '200px',
          borderRadius: '12px',
          background:   'rgba(255,255,255,0.03)',
          animation:    'skPulse 1.5s ease infinite',
        }} />
      </div>
      <style>{`
        @keyframes skPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ── Protected Layout ──────────────────────────────────────────────────────────

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router            = useRouter();

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/?auth=login');
    }
  }, [user, loading, router]);

  // Show skeleton while auth state resolves
  if (loading) return <LayoutSkeleton />;

  // Don't flash protected content before redirect fires
  if (!user) return null;

  return (
    <div style={{
      display:    'flex',
      minHeight:  '100vh',
      background: '#070B14',
      fontFamily: "'Sora', sans-serif",
    }}>

      {/* ── Sidebar — fixed width, full height ─────────────────────────── */}
      <Sidebar />

      {/* ── Main content — fills remaining width ───────────────────────── */}
      <div style={{
        flex:       1,
        minWidth:   0,          // prevents flex child from overflowing
        display:    'flex',
        flexDirection: 'column',
        overflowY:  'auto',
        overflowX:  'hidden',
        minHeight:  '100vh',
      }}>
        {children}
      </div>

    </div>
  );
}