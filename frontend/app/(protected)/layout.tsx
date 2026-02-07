/* eslint-disable react-hooks/set-state-in-effect */
//frontend/app/(protected)layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/');
      } else {
        const ok = localStorage.getItem('credentialsComplete') === 'true';
        if (!ok) {
          router.replace('/auth/credentials');
        }
      }
      setChecked(true);
    }
  }, [loading, user, router]);

  if (loading || !checked) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}