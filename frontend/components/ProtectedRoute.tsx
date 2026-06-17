// frontend/components/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'candidate' | 'recruiter' | 'admin';
}

export default function ProtectedRoute({ 
  children, 
  requireRole 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (loading) return;

    // If no user, redirect to login
    if (!user) {
      // Store the intended destination for post-login redirect
      const redirectUrl = encodeURIComponent(pathname);
      router.replace(`/?auth=login&redirect=${redirectUrl}`);
      return;
    }

    // If role is required and doesn't match, redirect
    if (requireRole && user.role !== requireRole) {
      router.replace('/dashboard');
      return;
    }
  }, [user, loading, router, pathname, requireRole]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070B14]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#38BDF8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if no user
  if (!user) {
    return null;
  }

  // Don't render if role doesn't match
  if (requireRole && user.role !== requireRole) {
    return null;
  }

  return <>{children}</>;
}