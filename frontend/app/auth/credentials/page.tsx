'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function CredentialsPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validatePassword(pass: string) {
    return (
      pass.length >= 8 &&
      /[A-Z]/.test(pass) &&
      /[0-9]/.test(pass) &&
      /[!@#$%^&*]/.test(pass)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validatePassword(password) && mode === 'create') {
      setError(
        'Password must be 8+ chars, include uppercase, number & special character.'
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        alert('Check your email to verify your account.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const user = (await supabase.auth.getUser()).data.user;

        if (!user?.email_confirmed_at) {
          throw new Error('Please verify your email first.');
        }

        // update role in profile
        await supabase
          .from('profiles')
          .update({ role })
          .eq('id', user.id);

        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    alert('Password reset email sent.');
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">
        {mode === 'create' ? 'Create Account' : 'Login'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">

        <div className="flex gap-4 text-sm">
          <label>
            <input
              type="radio"
              checked={mode === 'create'}
              onChange={() => setMode('create')}
            />
            Sign Up
          </label>
          <label>
            <input
              type="radio"
              checked={mode === 'login'}
              onChange={() => setMode('login')}
            />
            Login
          </label>
        </div>

        <div className="flex gap-4 text-sm">
          <label>
            <input
              type="radio"
              checked={role === 'candidate'}
              onChange={() => setRole('candidate')}
            />
            Candidate
          </label>
          <label>
            <input
              type="radio"
              checked={role === 'recruiter'}
              onChange={() => setRole('recruiter')}
            />
            Recruiter
          </label>
        </div>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-sm cursor-pointer"
          >
            {showPassword ? 'Hide' : 'Show'}
          </span>
        </div>

        {mode === 'login' && (
          <p
            onClick={handleForgotPassword}
            className="text-sm text-blue-500 cursor-pointer"
          >
            Forgot Password?
          </p>
        )}

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'create' ? 'Sign Up' : 'Login'}
        </Button>
      </form>
    </div>
  );
}