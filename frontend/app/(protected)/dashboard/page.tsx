'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import CandidateDashboard from '@/app/_components/profiles/CandidateProfilePage';
import RecruiterDashboard from '@/app/_components/profiles/RecruiterProfilePage';

function normalizeRole(role?: string | null) {
  const value = String(role ?? '').toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker') return 'candidate';
  if (value === 'recruiter') return 'recruiter';
  if (value === 'admin') return 'admin';
  if (value === 'super_admin') return 'super_admin';

  return value;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#070B14',
          color: '#E2E8F0',
          padding: '2rem',
          fontFamily: "'Sora', sans-serif",
        }}
      >
        <div
          style={{
            height: 28,
            width: 260,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 14,
            width: 420,
            maxWidth: '100%',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
          }}
        />
      </main>
    );
  }

  const role = normalizeRole(user?.role);

  if (role === 'recruiter') {
    return <RecruiterDashboard />;
  }

  return <CandidateDashboard />;
}