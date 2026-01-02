'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signin');
    }
  }, [loading, user, router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}
