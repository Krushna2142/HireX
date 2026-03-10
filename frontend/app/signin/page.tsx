'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-gradient mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted-foreground">Enter your email and password to sign in.</p>

      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-sm">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="text-right text-sm">
          <a href="/forgot-password" className="text-purple-500 hover:underline">
            Forgot password?
          </a>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-purple-500 hover:underline">
          Register
        </a>
      </p>
    </main>
  );
}
