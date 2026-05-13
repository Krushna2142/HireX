'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getMe,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  removeToken,
  roleRedirectPath,
  setToken,
} from '@/lib/auth';
import type { AuthResponse, PublicAuthRole, User } from '@/lib/auth';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (
    fullName: string,
    email: string,
    password: string,
    role: PublicAuthRole,
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error('AuthProvider not mounted');
  },
  register: async () => {
    throw new Error('AuthProvider not mounted');
  },
  logout: async () => {},
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

    async function boot() {
      try {
        const token = getToken();

        if (!token) {
          if (!cancelled) {
            removeToken();
            setUser(null);
          }
          return;
        }

        setToken(token);

        const me = await getMe();

        if (!cancelled) {
          if (me) {
            setUser(me);
            localStorage.setItem('user', JSON.stringify(me));
          } else {
            removeToken();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('[AuthProvider] auth boot failed:', error);

        if (!cancelled) {
          removeToken();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      localStorage.removeItem('user');

      const res = await apiLogin(email, password);

      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));

      router.replace(roleRedirectPath(res.user.role));

      return res;
    },
    [router],
  );

  const register = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      role: PublicAuthRole,
    ): Promise<AuthResponse> => {
      localStorage.removeItem('user');

      const res = await apiRegister(fullName, email, password, role);

      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));

      router.replace(roleRedirectPath(res.user.role));

      return res;
    },
    [router],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.replace('/');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}