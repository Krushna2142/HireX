'use client';

import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/components/providers/AuthProvider';

export default function NavbarActions() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

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
          <Button variant="outline" onClick={signOutUser}>
            Sign out
          </Button>
        </>
      ) : (
        <Button onClick={signInWithGoogle}>Sign in</Button>
      )}
    </div>
  );
}
