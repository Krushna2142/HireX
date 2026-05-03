'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, roleRedirectPath } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const token = params.get('token');
      if (!token) {
        router.replace('/?auth=login&error=missing_oauth_token');
        return;
      }

      try {
        // Store access token
        setToken(token);

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.replace('/?auth=login&error=invalid_oauth_token');
          return;
        }

        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));
        router.replace(roleRedirectPath(user.role));
      } catch {
        router.replace('/?auth=login&error=oauth_callback_failed');
      }
    };

    void run();
  }, [params, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#070B14]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#38BDF8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Signing you in...</p>
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#070B14]">
          <p className="text-white">Loading...</p>
        </main>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}