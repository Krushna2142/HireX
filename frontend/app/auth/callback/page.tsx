'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const token = params.get('token');

      if (!token) {
        router.replace('/login?error=missing_oauth_token');
        return;
      }

      try {
        localStorage.setItem('token', token);

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem('token');
          router.replace('/login?error=invalid_oauth_token');
          return;
        }

        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));

        if (user?.role === 'recruiter') router.replace('/dashboard/recruiter');
        else router.replace('/dashboard');
      } catch {
        localStorage.removeItem('token');
        router.replace('/login?error=oauth_callback_failed');
      }
    };

    void run();
  }, [params, router]);

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1>Signing you in...</h1>
      <p>Please wait.</p>
    </main>
  );
}