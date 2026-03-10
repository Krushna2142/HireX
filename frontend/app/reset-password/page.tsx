'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setError('Invalid or missing reset token. Please request a new reset link.');
    } else {
      setToken(t);
    }
  }, [searchParams]);

  function validatePassword(pass: string) {
    return (
      pass.length >= 8 &&
      /[A-Z]/.test(pass) &&
      /[0-9]/.test(pass) &&
      /[!@#$%^&*]/.test(pass)
    );
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!validatePassword(password)) {
      setError(
        'Password must be 8+ chars, include uppercase, number & special character.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => router.push('/auth/credentials'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          Reset Password
        </h1>

        {success ? (
          <div className="text-center">
            <p className="text-green-400 text-sm mb-2">
              Password updated successfully!
            </p>
            <p className="text-gray-400 text-sm">
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white"
            />
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white"
            />

            <p className="text-gray-400 text-xs">
              Password must be 8+ characters with uppercase, number, and special character.
            </p>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>

            <button
              type="button"
              onClick={() => router.push('/auth/credentials')}
              className="text-sm text-gray-400 w-full hover:text-white text-center"
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-white">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
