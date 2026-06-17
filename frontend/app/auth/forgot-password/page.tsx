'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLocalMessage(null);

    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      // Security: never reveal if the email exists or not.
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),rgba(2,6,23,0.95)_45%,#020617)]">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-950/90 p-7 shadow-2xl text-white">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300 font-bold">
            HireX Security
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Forgot Password
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter your email. We will send a 6-digit reset code and a reset link.
          </p>
        </div>

        {sent ? (
          <div className="mt-7 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-center">
            <p className="text-sm text-emerald-200 leading-6">
              If this email exists, a password reset code has been sent. Check your
              inbox/spam folder.
            </p>

            <div className="mt-5 grid gap-3">
              <Link
                href={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                className="inline-flex justify-center rounded-xl bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 px-4 py-3 text-sm font-black text-slate-950"
              >
                Enter Reset Code
              </Link>

              <Link
                href="/"
                className="text-sm font-bold text-sky-300 hover:text-sky-200"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {localMessage && (
              <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">
                {localMessage}
              </div>
            )}

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

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 font-black text-slate-950 hover:opacity-95"
            >
              {loading ? 'Sending code...' : 'Send Reset Code'}
            </Button>

            <p className="text-center text-sm">
              <Link href="/" className="font-bold text-sky-300 hover:text-sky-200">
                Back to Home
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}