'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, roleRedirectPath } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const token = params.get('token');
      if (!token) return router.replace('/?auth=login&error=missing_oauth_token');

      try {
        setToken(token);

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          return router.replace('/?auth=login&error=invalid_oauth_token');
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

  return <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>Signing you in...</main>;
}