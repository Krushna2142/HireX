/* eslint-disable react-hooks/set-state-in-effect */
//frontend/app/(protected)layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { getFirebaseAuth } from '@/lib/firebase/Client';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function checkCredentials() {
      if (!loading) {
        if (!user) {
          router.replace('/');
        } else {
          // First check localStorage for quick access
          const localCheck = localStorage.getItem('credentialsComplete') === 'true';
          
          if (!localCheck) {
            // Double-check with backend
            try {
              const auth = getFirebaseAuth();
              const currentUser = auth.currentUser;
              if (currentUser) {
                const idToken = await currentUser.getIdToken();
                const response = await fetch('/api/auth/credentials/check', {
                  headers: {
                    'Authorization': `Bearer ${idToken}`,
                  },
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.credentialsComplete) {
                    localStorage.setItem('credentialsComplete', 'true');
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('username', data.username);
                  } else {
                    router.replace('/auth/credentials');
                  }
                } else {
                  router.replace('/auth/credentials');
                }
              } else {
                router.replace('/auth/credentials');
              }
            } catch (error) {
              console.error('Error checking credentials:', error);
              router.replace('/auth/credentials');
            }
          }
        }
        setChecked(true);
      }
    }

    checkCredentials();
  }, [loading, user, router]);

  if (loading || !checked) return <div className="p-4">Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}