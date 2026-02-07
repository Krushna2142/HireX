'use client';
//frontend/app/admin/login/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid admin credentials');
      }

      // Store admin session info
      localStorage.setItem('adminAuthenticated', 'true');
      localStorage.setItem('adminRole', data.role);
      localStorage.setItem('adminUsername', username);

      // Redirect to admin dashboard or appropriate page
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This login is only for administrators.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          placeholder="Admin username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          aria-label="Admin username"
          aria-describedby={loading ? "admin-loading-message" : undefined}
        />
        <Input
          placeholder="Admin password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          aria-label="Admin password"
          aria-describedby={loading ? "admin-loading-message" : undefined}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          <span id="admin-loading-message" className="sr-only">
            {loading && 'Form is processing, please wait'}
          </span>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}