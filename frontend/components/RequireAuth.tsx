'use client';
import { useAuth } from '@/components/providers/AuthProvider';
// frontend/components/RequireAuth.tsx
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <div className="text-sm">Please sign in to continue.</div>;
  return <>{children}</>;
}
