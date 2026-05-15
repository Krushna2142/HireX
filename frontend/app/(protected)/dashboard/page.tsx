'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/dashboard/page.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';

function normalizeRole(role?: string | null) {
  const value = String(role ?? '').toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker' || value === 'candidate') {
    return 'candidate';
  }

  if (value === 'recruiter') return 'recruiter';
  if (value === 'admin') return 'admin';
  if (value === 'super_admin') return 'super_admin';

  return value;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const role = normalizeRole(user?.role);

    if (role === 'recruiter') {
      router.replace('/recruiter/dashboard');
      return;
    }

    router.replace('/candidate/dashboard');
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
      <div
        style={{
          height: 28,
          width: 240,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          marginBottom: 16,
        }}
      />
      <div
        style={{
          height: 14,
          width: 380,
          maxWidth: '100%',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
        }}
      />
    </main>
  );
}