'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  removeToken,
  roleRedirectPath,
} from '@/lib/auth';
import type { User, UserRole, AuthResponse } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Context contract
//
// Deliberately minimal — only what consumers actually need.
// No `isAuthenticated` (derive from `!!user`), no `refresh` (call getMe),
// no `setUser` (internal concern). This prevents consumers from depending
// on implementation details that change between iterations.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user:     User | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<AuthResponse>;
  register: (
    fullName: string,
    email:    string,
    password: string,
    role:     UserRole,
  ) => Promise<AuthResponse>;
  logout:   () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user:     null,
  loading:  true,
  login:    async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  logout:   () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider
//
// Architectural principles enforced here:
//
// 1. NEVER gate children on loading state — the provider's responsibility
//    is to resolve and expose auth state, not to control rendering.
//    Pages receive `loading: true` and decide their own loading UX.
//
// 2. Token resolution happens once on mount via getMe(). Subsequent
//    auth state changes happen synchronously via setUser() in login/logout.
//
// 3. All auth side effects (redirect after login/register) are the
//    caller's responsibility, not the provider's. The provider only
//    manages state — consumers drive navigation.
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  // ── Resolve persisted session on mount ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    getMe()
      .then(u => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Cleanup prevents state updates on unmounted component
    return () => { cancelled = true; };
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      const res = await apiLogin(email, password);
      setUser(res.user);
      return res;
    },
    [],
  );

  // ── Register ────────────────────────────────────────────────────────────────
  const register = useCallback(
    async (
      fullName: string,
      email:    string,
      password: string,
      role:     UserRole,
    ): Promise<AuthResponse> => {
      const res = await apiRegister(fullName, email, password, role);
      setUser(res.user);
      return res;
    },
    [],
  );

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.replace('/');
  }, [router]);

  // ── Memoized context value — prevents unnecessary consumer re-renders ───────
  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  // ✅ Always render children — never block on loading state
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}