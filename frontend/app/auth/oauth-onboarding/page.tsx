'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken, roleRedirectPath } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function OAuthOnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();

  const onboardingToken = params.get('ot') ?? '';
  const provider = (params.get('provider') ?? 'oauth').toLowerCase();
  const mode = (params.get('mode') ?? 'signin').toLowerCase();
  const email = params.get('email') ?? '';
  const name = params.get('name') ?? '';

  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const title = useMemo(
    () =>
      mode === 'signin'
        ? `No account found. Complete signup with ${provider}.`
        : `Complete signup with ${provider}.`,
    [mode, provider],
  );

  const onContinue = async () => {
    try {
      setLoading(true);
      setErr('');

      const res = await fetch(`${API_BASE}/auth/oauth/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingToken, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Signup failed');

      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace(roleRedirectPath(data.user.role));
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>{title}</h1>
      {name ? <p><strong>Name:</strong> {name}</p> : null}
      {email ? <p><strong>Email:</strong> {email}</p> : null}

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="radio"
            checked={role === 'candidate'}
            onChange={() => setRole('candidate')}
          />{' '}
          Job Seeker
        </label>
        <label style={{ display: 'block' }}>
          <input
            type="radio"
            checked={role === 'recruiter'}
            onChange={() => setRole('recruiter')}
          />{' '}
          Recruiter
        </label>
      </div>

      {err ? <p style={{ color: 'red', marginBottom: 12 }}>{err}</p> : null}

      <button onClick={onContinue} disabled={loading || !onboardingToken}>
        {loading ? 'Please wait...' : 'Continue'}
      </button>
    </main>
  );
}

export default function OAuthOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
          Loading...
        </main>
      }
    >
      <OAuthOnboardingInner />
    </Suspense>
  );
}

