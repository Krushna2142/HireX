'use client';

import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export default function NavbarActions() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

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
          <Button variant="outline" onClick={() => { logout(); router.push('/'); }}>
            Sign out
          </Button>
        </>
      ) : (
        <Button onClick={() => router.push('/auth/credentials')}>Sign in</Button>
      )}
    </div>
  );
}
