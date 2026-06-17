'use client';
import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sidebar } from '@/app/_components/shared/Sidebar';
import { useJobStream } from '@/hooks/useJobStream';
import { ProfilePanelProvider } from '@/components/context/ProfilePanelContext';

function LayoutSkeleton() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#070B14',
        color: '#F8FAFC',
        fontFamily: "'Sora', sans-serif",
      }}
    >
      <div className="w-12 h-12 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  useJobStream();

  useEffect(() => {
    // Strict auth check: if not loading and no user, redirect to login immediately
    if (!loading && !user) {
      router.replace('/?auth=login');
    }
  }, [user, loading, router]);

  // Show skeleton while checking auth
  if (loading) return <LayoutSkeleton />;
  
  // If no user after loading, render nothing (redirect will happen)
  if (!user) return null;

  const isInterviewRoom =
    pathname?.includes('/interviews/room/') ||
    (pathname?.includes('/recruiter/interviews/') && pathname?.includes('/live'));

  if (isInterviewRoom) {
    return (
      <ProfilePanelProvider>
        <div
          style={{
            minHeight: '100vh',
            width: '100vw',
            overflow: 'hidden',
            background: '#030712',
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {children}
        </div>
      </ProfilePanelProvider>
    );
  }

  return (
    <ProfilePanelProvider>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#070B14',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: '100vh',
          }}
        >
          {children}
        </div>
      </div>
    </ProfilePanelProvider>
  );
}