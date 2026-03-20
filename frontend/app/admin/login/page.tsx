'use client';
//frontend/app/admin/login/page.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // TODO: backend admin login (PostgreSQL + role check)
    console.log('Admin login', { username, password });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This login is only for administrators.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          placeholder="Admin username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          placeholder="Admin password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
