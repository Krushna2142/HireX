/* eslint-disable react-hooks/set-state-in-effect */
//frontend/app/(protected)layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/');
      } else {
        // Check if credentials are complete (localStorage cache first, then backend)
        const cachedComplete = localStorage.getItem('credentialsComplete') === 'true';
        if (cachedComplete) {
          setChecked(true);
        } else {
          // Optionally call backend /api/auth/credentials/check to verify
          // For now, show modal if not cached
          setShowCredentialsModal(true);
          setChecked(true);
        }
      }
    }
  }, [loading, user, router]);

  if (loading || !checked) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  return (
    <>
      {children}
      <CredentialsModal
        open={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
      />
    </>
  );
}