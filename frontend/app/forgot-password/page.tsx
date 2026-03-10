'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess('If that email exists, a password reset link has been sent. Please check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Forgot Password</h1>
      <p className="mt-2 text-muted-foreground">Enter your email address and we&apos;ll send you a reset link.</p>

      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      {success && <p className="mt-4 text-green-500 text-sm">{success}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Remember your password?{' '}
        <a href="/signin" className="text-purple-500 hover:underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
