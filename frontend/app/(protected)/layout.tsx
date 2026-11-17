'use client';
// frontend/app/(protected)/layout.tsx
import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sidebar } from '@/app/_components/shared/Sidebar';
import { useJobStream } from '@/hooks/useJobStream';
import { ProfilePanelProvider } from '@/components/context/ProfilePanelContext';

function LayoutSkeleton() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#070B14', color: '#F8FAFC', fontFamily: "'Sora', sans-serif" }}>
      <div className="w-12 h-12 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Ambient background layer.
 * Sits BEHIND the translucent sidebar and every page, so the glass sidebar
 * picks up soft sky / violet / emerald / rose color shifts and the small
 * glowing presence dots — one unified background for the whole app.
 */
function AmbientBase() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes ambPulse { 0%,100%{opacity:.9;transform:scale(1)} 50%{opacity:.35;transform:scale(.8)} }
        @keyframes ambDrift { 0%{transform:translate3d(0,0,0)} 50%{transform:translate3d(4vw,3vh,0)} 100%{transform:translate3d(0,0,0)} }
      `}</style>
      {/* large soft orbs */}
      <div style={{ position: 'absolute', top: '-18%', left: '-6%', width: 620, height: 620, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.16, background: 'radial-gradient(circle, #38BDF8, transparent 65%)', animation: 'ambDrift 26s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '-14%', right: '-8%', width: 560, height: 560, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.14, background: 'radial-gradient(circle, #A78BFA, transparent 65%)', animation: 'ambDrift 32s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute', bottom: '-22%', left: '4%', width: 520, height: 520, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.10, background: 'radial-gradient(circle, #34D399, transparent 65%)', animation: 'ambDrift 38s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-18%', right: '2%', width: 480, height: 480, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.10, background: 'radial-gradient(circle, #F472B6, transparent 65%)', animation: 'ambDrift 30s ease-in-out infinite reverse' }} />
      {/* small presence dots (the green/sky/violet specks) */}
      <div style={{ position: 'absolute', top: 10, left: '22%', width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 12px #34D399', animation: 'ambPulse 2.4s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: 14, left: '26%', width: 5, height: 5, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 10px #38BDF8', animation: 'ambPulse 3.1s ease-in-out infinite .4s' }} />
      <div style={{ position: 'absolute', top: 9, left: '30%', width: 4, height: 4, borderRadius: '50%', background: '#A78BFA', boxShadow: '0 0 10px #A78BFA', animation: 'ambPulse 2.8s ease-in-out infinite .8s' }} />
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  useJobStream();

  useEffect(() => {
    if (!loading && !user) router.replace('/?auth=login');
  }, [user, loading, router]);

  if (loading) return <LayoutSkeleton />;
  if (!user) return null;

  const isInterviewRoom =
    pathname?.includes('/interviews/room/') ||
    (pathname?.includes('/recruiter/interviews/') && pathname?.includes('/live'));

  if (isInterviewRoom) {
    return (
      <ProfilePanelProvider>
        <div style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', background: '#030712', fontFamily: "'Sora', sans-serif" }}>
          {children}
        </div>
      </ProfilePanelProvider>
    );
  }

  return (
    <ProfilePanelProvider>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          minHeight: '100vh',
          // Unified ambient base — the glass sidebar blurs/tints from this.
          background:
            'radial-gradient(1100px 500px at 12% -10%, rgba(56,189,248,0.10), transparent 60%), ' +
            'radial-gradient(900px 480px at 85% -10%, rgba(167,139,250,0.10), transparent 60%), ' +
            'radial-gradient(700px 420px at 8% 110%, rgba(52,211,153,0.07), transparent 60%), ' +
            'radial-gradient(700px 420px at 92% 110%, rgba(244,114,182,0.06), transparent 60%), ' +
            '#070B14',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        <AmbientBase />
        <Sidebar />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', minHeight: '100vh', background: 'transparent' }}>
          {children}
        </div>
      </div>
    </ProfilePanelProvider>
  );
}