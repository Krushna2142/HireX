'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { clearIntendedRole, getIntendedRole } from '@/lib/auth-intent';

type Role = 'candidate' | 'recruiter' | 'admin' | 'super_admin';

const LABEL: Record<Role, string> = {
  candidate: 'Job Seeker',
  recruiter: 'Recruiter',
  admin: 'Admin',
  super_admin: 'Admin',
};

function destFor(role: Role): string {
  if (role === 'admin' || role === 'super_admin') return '/admin/dashboard';
  if (role === 'recruiter') return '/recruiter/dashboard';
  return '/candidate/dashboard';
}

function resolveRole(user: unknown): Role {
  const u = user as { role_normalized?: Role; role?: string };
  if (u.role_normalized) return u.role_normalized;
  const r = (u.role ?? '').toLowerCase();
  if (!r || r === 'jobseeker' || r === 'job_seeker') return 'candidate';
  return r as Role;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const handled = useRef(false); // StrictMode double-effect guard -> no redirect loop
  const [mismatch, setMismatch] = useState<Role | null>(null);

  useEffect(() => {
    if (loading || handled.current) return;
    handled.current = true;

    if (!user) {
      let msg: string | null = null;
      try {
        msg = sessionStorage.getItem('hx_auth_error');
        sessionStorage.removeItem('hx_auth_error');
      } catch { /* ignore */ }
      clearIntendedRole();
      toast.error(msg ?? 'Google sign-in failed. Please try again.');
      router.replace('/?auth=login&error=oauth_failed');
      return;
    }

    const actual = resolveRole(user);
    const intended = getIntendedRole();
    clearIntendedRole();

    // Existing DB role wins. Tell user, never silently switch.
    if (intended && (actual === 'candidate' || actual === 'recruiter') && intended !== actual) {
      setMismatch(actual);
      return;
    }

    router.replace(destFor(actual));
  }, [user, loading, router]);

  if (mismatch) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070B14] p-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white">
          <h1 className="text-xl font-bold mb-2">
            This account is already registered as {LABEL[mismatch]}.
          </h1>
          <p className="text-sm text-white/60 mb-6">
            Your existing role stays unchanged. Continue to your {LABEL[mismatch]} dashboard.
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => router.replace(destFor(mismatch))}
              className="py-3 rounded-xl font-semibold bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]"
            >
              Go to {LABEL[mismatch]} dashboard
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="py-3 rounded-xl border border-white/15 text-white/70"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#070B14]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#38BDF8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Signing you in...</p>
      </div>
    </main>
  );
}