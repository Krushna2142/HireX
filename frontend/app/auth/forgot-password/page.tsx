'use client';
// frontend/app/auth/forgot-password/page.tsx
import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // Don't reveal if email exists
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your email to receive a reset link
          </p>
        </div>

        {sent ? (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-green-700 dark:text-green-400">
              If the email exists, a password reset link has been sent. Check your inbox.
            </p>
            <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-500 font-medium">
              Back to Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <p className="text-center text-sm">
              <Link href="/" className="text-blue-600 hover:text-blue-500">
                Back to Home
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
