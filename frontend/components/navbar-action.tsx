'use client';

import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/providers/AuthProvider';

export default function NavbarActions() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {user ? (
        <>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            {user.email}
          </span>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </>
      ) : (
        <Button onClick={() => window.location.href = '/auth/credentials'}>Sign in</Button>
      )}
    </div>
  );
}
