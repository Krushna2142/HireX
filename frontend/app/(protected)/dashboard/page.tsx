'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import CandidateDashboard from '@/app/_components/profiles/CandidateProfilePage';
import RecruiterDashboard from '@/app/_components/profiles/RecruiterProfilePage';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'recruiter') {
    return <RecruiterDashboard />;
  }

  return <CandidateDashboard />;
}