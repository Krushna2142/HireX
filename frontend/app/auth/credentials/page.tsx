'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function CredentialsPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
    setInfo(null);

    if (mode === 'create' && !validatePassword(password)) {
      setError(
        'Password must be 8+ chars, include uppercase, number & special character.'
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password, role }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Registration failed');
        }

        setInfo('Account created! You can now log in.');
        setMode('login');
        setFullName('');
        setPassword('');
      } else {
        await login(email, password);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      setInfo('If that email is registered, a password reset link has been sent.');
    } catch {
      setInfo('If that email is registered, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
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
            {' '}Sign Up
          </label>
          <label>
            <input
              type="radio"
              checked={mode === 'login'}
              onChange={() => setMode('login')}
            />
            {' '}Login
          </label>
        </div>

        {mode === 'create' && (
          <div className="flex gap-4 text-sm">
            <label>
              <input
                type="radio"
                checked={role === 'candidate'}
                onChange={() => setRole('candidate')}
              />
              {' '}Candidate
            </label>
            <label>
              <input
                type="radio"
                checked={role === 'recruiter'}
                onChange={() => setRole('recruiter')}
              />
              {' '}Recruiter
            </label>
          </div>
        )}

        {mode === 'create' && (
          <Input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}

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

        {info && (
          <p className="text-green-500 text-sm">{info}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'create' ? 'Sign Up' : 'Login'}
        </Button>
      </form>
    </div>
  );
}