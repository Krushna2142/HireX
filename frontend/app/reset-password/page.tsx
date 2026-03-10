'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const msg = await resetPassword(token, password);
      setSuccess(msg);
      setTimeout(() => router.push('/signin'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-gradient mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-bold">Reset Password</h1>
      <p className="mt-2 text-muted-foreground">Enter your new password below.</p>

      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      {success && <p className="mt-4 text-green-500 text-sm">{success}</p>}

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <input
          type="password"
          placeholder="New Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm"
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm"
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}