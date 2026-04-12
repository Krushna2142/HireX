'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api';

export default function OAuthOnboardingPage() {
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

  const title = useMemo(() => {
    if (mode === 'signin') return `No account found. Complete signup with ${provider}.`;
    return `Complete signup with ${provider}.`;
  }, [mode, provider]);

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

      if (!res.ok) {
        throw new Error(
          Array.isArray(data?.message) ? data.message.join(', ') : (data?.message ?? 'Signup failed'),
        );
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'recruiter') router.replace('/dashboard/recruiter');
      else router.replace('/dashboard');
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