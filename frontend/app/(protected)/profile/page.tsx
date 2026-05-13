'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import CandidateProfilePage from '@/app/_components/profiles/CandidateProfilePage';
import RecruiterProfilePage from '@/app/_components/profiles/RecruiterProfilePage';

function normalizeRole(role?: string | null) {
  const value = String(role ?? '').toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker') return 'candidate';
  if (value === 'recruiter') return 'recruiter';
  if (value === 'admin') return 'admin';
  if (value === 'super_admin') return 'super_admin';

  return value;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#050816',
          color: '#E5E7EB',
          padding: '2rem',
        }}
      >
        <div
          style={{
            height: 28,
            width: 220,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 14,
            width: 360,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      </main>
    );
  }

  const role = normalizeRole(user?.role);

  if (role === 'recruiter') {
    return <RecruiterProfilePage />;
  }

  return <CandidateProfilePage />;
}