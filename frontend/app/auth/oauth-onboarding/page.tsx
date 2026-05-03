'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens, roleRedirectPath } from '@/lib/auth';

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

      // Store both tokens
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace(roleRedirectPath(data.user.role));
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#070B14] p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        {name && (
          <p className="text-white/70 mb-1">
            <strong>Name:</strong> {name}
          </p>
        )}
        {email && (
          <p className="text-white/70 mb-6">
            <strong>Email:</strong> {email}
          </p>
        )}

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 cursor-pointer hover:border-[#38BDF8]/50 transition-colors">
            <input
              type="radio"
              checked={role === 'candidate'}
              onChange={() => setRole('candidate')}
              className="w-5 h-5 accent-[#38BDF8]"
            />
            <div>
              <div className="text-white font-semibold">🎯 Job Seeker</div>
              <div className="text-white/50 text-sm">
                Get AI-matched to jobs, track applications
              </div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 cursor-pointer hover:border-[#F472B6]/50 transition-colors">
            <input
              type="radio"
              checked={role === 'recruiter'}
              onChange={() => setRole('recruiter')}
              className="w-5 h-5 accent-[#F472B6]"
            />
            <div>
              <div className="text-white font-semibold">🏢 Recruiter</div>
              <div className="text-white/50 text-sm">
                Post jobs, find candidates, manage hiring
              </div>
            </div>
          </label>
        </div>

        {err && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{err}</p>
          </div>
        )}

        <button
          onClick={onContinue}
          disabled={loading || !onboardingToken}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Please wait...' : 'Continue'}
        </button>
      </div>
    </main>
  );
}

export default function OAuthOnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#070B14]">
          <p className="text-white">Loading...</p>
        </main>
      }
    >
      <OAuthOnboardingInner />
    </Suspense>
  );
}