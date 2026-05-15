'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/profile/page.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';

function normalizeRole(role?: string | null) {
  const value = String(role ?? '').toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker' || value === 'candidate') {
    return 'candidate';
  }

  if (value === 'recruiter') return 'recruiter';

  return value;
}

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const role = normalizeRole(user?.role);

    if (role === 'recruiter') {
      router.replace('/recruiter/profile');
      return;
    }

    router.replace('/candidate/profile');
  }, [loading, router, user?.role]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#070B14',
        color: '#E5E7EB',
        padding: '2rem',
        fontFamily: "'Sora', sans-serif",
      }}
    >
      Loading profile...
    </main>
  );
}