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
  getToken,
  setToken,
  login as apiLogin,
  register as apiRegister,
  removeToken,
} from '@/lib/auth';
import type { User, UserRole, AuthResponse } from '@/lib/auth';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (fullName: string, email: string, password: string, role: Exclude<UserRole, 'admin'>) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  logout: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const token = getToken();
        if (!token) {
          if (!cancelled) {
            setUser(null);
            localStorage.removeItem('user');
          }
          return;
        }

        // keep cookie in sync for middleware
        setToken(token);

        const me = await getMe(); // SOURCE OF TRUTH
        if (!cancelled) {
          setUser(me);
          localStorage.setItem('user', JSON.stringify(me));
        }
      } catch {
        if (!cancelled) {
          removeToken();
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void boot();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    localStorage.removeItem('user'); // prevent stale role
    const res = await apiLogin(email, password);
    setUser(res.user);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  }, []);

  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    role: Exclude<UserRole, 'admin'>,
  ): Promise<AuthResponse> => {
    localStorage.removeItem('user'); // prevent stale role
    const res = await apiRegister(fullName, email, password, role);
    setUser(res.user);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    localStorage.removeItem('user');
    setUser(null);
    router.replace('/'); // always landing page
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
