'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { getIntendedRole, setIntendedRole } from '@/lib/auth-intent';
import {
  getMe,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  removeToken,
  roleRedirectPath,
  setToken,
  type AuthResponse,
  type PublicAuthRole,
  type User as LegacyUser,
} from '@/lib/auth';

export interface User {
  id: string;
  supabase_user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  role_normalized:
    | 'candidate' | 'recruiter' | 'admin' | 'super_admin'
    | 'college_admin' | 'tpo' | 'placement_coordinator' | 'interviewer';
  email_verified: boolean;
  created_at: string;
}

export interface AuthContextValue {
  user: User | LegacyUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (fullName: string, email: string, password: string, role: PublicAuthRole) => Promise<AuthResponse>;
  signInWithGoogle: (role?: PublicAuthRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  signInWithGoogle: async () => { throw new Error('AuthProvider not mounted'); },
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Supabase (Google) users resolved by NestJS: GET /api/auth/me
const PROFILE_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
).replace(/\/$/, '');

// Presence-only cookie so middleware.ts lets Supabase-authenticated users through. NOT a credential.
const SESSION_COOKIE = 'hx_session';
const AUTH_ERROR_KEY = 'hx_auth_error';

function setSessionCookie(): void {
  if (typeof document === 'undefined') return;
  const secure = process.env.NODE_ENV === 'production' ? ';Secure' : '';
  document.cookie = `${SESSION_COOKIE}=1;path=/;SameSite=Lax;max-age=${60 * 60 * 24 * 7}${secure}`;
}

function clearSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=;path=/;max-age=0`;
}

function normalizeRoleName(role: unknown): User['role_normalized'] {
  const r = String(role ?? '').toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'super_admin') return 'super_admin';
  if (r === 'recruiter') return 'recruiter';
  if (r === 'college_admin') return 'college_admin';
  if (r === 'tpo') return 'tpo';
  if (r === 'placement_coordinator') return 'placement_coordinator';
  if (r === 'interviewer') return 'interviewer';
  return 'candidate';
}

function toHirexUser(raw: any, session: Session): User {
  const su = session.user;
  const role = raw?.role_normalized ?? raw?.role ?? 'candidate';

  return {
    id: raw?.id ?? su.id,
    supabase_user_id: raw?.supabase_user_id ?? su.id,
    email: raw?.email ?? su.email ?? '',
    full_name: raw?.full_name ?? raw?.fullName ?? su.user_metadata?.full_name ?? su.user_metadata?.name ?? null,
    avatar_url: raw?.avatar_url ?? raw?.avatarUrl ?? su.user_metadata?.avatar_url ?? null,
    role: String(raw?.role ?? role),
    role_normalized: normalizeRoleName(role),
    email_verified: raw?.email_verified ?? raw?.emailVerified ?? Boolean(su.email_confirmed_at),
    created_at: raw?.created_at ?? raw?.createdAt ?? su.created_at,
  };
}

type ProfileResult = { user: User } | { error: string };

/**
 * Ask backend who this Supabase user is. Role comes ONLY from backend DB.
 * X-Intended-Role = registration intent, honoured server-side only for brand-new users.
 * On failure return error: never invent a role. Supabase session is kept.
 */
async function fetchBackendProfile(session: Session): Promise<ProfileResult> {
  try {
    const intended = getIntendedRole();
    const res = await fetch(`${PROFILE_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...(intended ? { 'X-Intended-Role': intended } : {}),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body?.message ?? `Sign-in failed (HTTP ${res.status}).` };
    }

    const raw = await res.json();
    return { user: toHirexUser(raw?.user ?? raw, session) };
  } catch (err) {
    console.warn('[AuthProvider] profile request failed:', err);
    return { error: 'Could not reach the HireX server. Please try again.' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | LegacyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const userRef = useRef<User | LegacyUser | null>(null);
  const bootRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const applyUser = useCallback((next: User | LegacyUser | null) => {
    userRef.current = next;
    if (mountedRef.current) setUser(next);
  }, []);

  const boot = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const result = await fetchBackendProfile(session);

        if ('error' in result) {
          try { sessionStorage.setItem(AUTH_ERROR_KEY, result.error); } catch { /* ignore */ }
          clearSessionCookie();
          applyUser(null); // never guess role; Supabase session kept
          return;
        }

        setSessionCookie();
        applyUser(result.user);
        try {
          localStorage.setItem('hirex_user', JSON.stringify(result.user));
        } catch { /* ignore */ }
        return;
      }

      // No Supabase session -> legacy email/password JWT flow (unchanged).
      clearSessionCookie();
      const token = getToken();
      if (token) {
        setToken(token);
        const me = await getMe();
        if (me) {
          applyUser(me);
          localStorage.setItem('user', JSON.stringify(me));
        } else {
          removeToken();
          applyUser(null);
        }
      } else {
        applyUser(null);
      }
    } catch (error) {
      console.error('[AuthProvider] auth boot failed:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyUser]);

  // Single-flight: concurrent callers share one run.
  const runBoot = useCallback(() => {
    if (!bootRef.current) {
      bootRef.current = boot().finally(() => {
        bootRef.current = null;
      });
    }
    return bootRef.current;
  }, [boot]);

  useEffect(() => {
    mountedRef.current = true;
    void runBoot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        applyUser(null);
        clearSessionCookie();
        localStorage.removeItem('hirex_user');
        localStorage.removeItem('user');
        removeToken();
        if (mountedRef.current) setLoading(false);
        return;
      }

      // Deferred: never call supabase APIs inside auth callback (deadlock risk).
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !userRef.current) {
        setTimeout(() => void runBoot(), 0);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [runBoot, applyUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      localStorage.removeItem('user');
      localStorage.removeItem('hirex_user');

      const res = await apiLogin(email, password);

      applyUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.replace(roleRedirectPath(res.user.role));

      return res;
    },
    [router, applyUser],
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      role: PublicAuthRole,
    ): Promise<AuthResponse> => {
      localStorage.removeItem('user');
      localStorage.removeItem('hirex_user');

      const res = await apiRegister(fullName, email, password, role);

      applyUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.replace(roleRedirectPath(res.user.role));

      return res;
    },
    [router, applyUser],
  );

  const signInWithGoogle = useCallback(async (role?: PublicAuthRole) => {
    if (role) setIntendedRole(role); // intent only; survives redirect in sessionStorage
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await apiLogout();
    applyUser(null);
    clearSessionCookie();
    localStorage.removeItem('hirex_user');
    localStorage.removeItem('user');
    removeToken();
    router.replace('/');
  }, [router, applyUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, signInWithGoogle, logout }),
    [user, loading, login, register, signInWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}