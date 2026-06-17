'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialToken = searchParams.get('token') || '';
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [token, setToken] = useState(initialToken);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const usesLinkToken = useMemo(() => Boolean(token.trim()), [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanToken = token.trim();

    if (!cleanToken && !cleanEmail) {
      setError('Email is required when using reset code.');
      return;
    }

    if (!cleanToken && !cleanCode) {
      setError('Reset code is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        email: cleanEmail,
        code: cleanCode,
        token: cleanToken,
        password,
      });

      setSuccess(true);

      window.setTimeout(() => {
        router.push('/');
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-center">
        <p className="text-sm text-emerald-200">
          Password reset successful. Redirecting to home...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      {error && (
        <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!usesLinkToken && (
        <>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-200">
              Email
            </label>

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-200">
              6-digit reset code
            </label>

            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              required
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 tracking-[0.45em]"
            />
          </div>
        </>
      )}

      {usesLinkToken && (
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-200">
            Reset token
          </label>

          <Input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Reset token"
            required
            className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
          />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-200">
          New Password
        </label>

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            required
            className="h-12 rounded-xl border-white/10 bg-white/5 pr-20 text-white placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-black text-sky-300"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-slate-200">
          Confirm Password
        </label>

        <div className="relative">
          <Input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            className="h-12 rounded-xl border-white/10 bg-white/5 pr-20 text-white placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={() => setShowConfirm((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-black text-sky-300"
          >
            {showConfirm ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-xl bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 font-black text-slate-950 hover:opacity-95"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),rgba(2,6,23,0.95)_45%,#020617)]">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-950/90 p-7 shadow-2xl text-white">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300 font-bold">
            Secure Reset
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Reset Password
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Use the reset code sent to your email or the reset link token.
          </p>
        </div>

        <Suspense fallback={<p className="mt-6 text-center text-slate-400">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}