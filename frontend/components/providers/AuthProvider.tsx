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
  getToken,       // ← added
  setToken,       // ← added
  login as apiLogin,
  register as apiRegister,
  removeToken,
  roleRedirectPath,
} from '@/lib/auth';
import type { User, UserRole, AuthResponse } from '@/lib/auth';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  useEffect(() => {
    let cancelled = false;

    // Re-sync localStorage token → cookie on every mount.
    // Middleware runs on the server and cannot read localStorage —
    // the cookie is its only signal. This keeps them in sync.
    const existingToken = getToken();
    if (existingToken) setToken(existingToken);

    getMe()
      .then(u  => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      const res = await apiLogin(email, password);
      setUser(res.user);
      return res;
    },
    [],
  );

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

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.replace('/');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}