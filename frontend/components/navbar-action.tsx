'use client';
// frontend/components/navbar-action.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/components/providers/AuthProvider';
import CredentialsModal from '@/components/auth/CredentialsModal';

export default function NavbarActions() {
  const { user, loading, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <>
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
          <Button onClick={() => setShowModal(true)}>Sign in</Button>
        )}
      </div>
      <CredentialsModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
