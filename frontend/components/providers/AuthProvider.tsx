/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/components/providers/AuthProvider.tsx
'use client';

import {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { getMe, login as loginFn, register as registerFn,
         removeToken, roleRedirectPath, User, UserRole, AuthResponse } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:     User | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout:   () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user:     null,
  loading:  true,
  login:    async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => {},
  logout:   () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  // Resolve auth state on mount — never blocks children
  useEffect(() => {
    getMe()
      .then(u   => setUser(u))
      .catch(()  => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      const res = await loginFn(email, password);
      setUser(res.user);
      return res;
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole) => {
      const res = await registerFn(name, email, password, role);
      setUser(res.user);
      router.replace(roleRedirectPath(role));
    },
    [router],
  );

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.replace('/');
  }, [router]);

  // ✅ CRITICAL: Always render children — never block on loading state
  // Pages receive `loading: true` and handle their own loading UI
  // The AuthProvider's job is to provide context, NOT to gate rendering
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
/*

---

## Why This Is The Correct Architecture
```
❌ Wrong pattern — AuthProvider gates children:
   AuthProvider (loading=true) → returns null → page never renders → blank screen

✅ Correct pattern — AuthProvider always renders children:
   AuthProvider (loading=true) → renders children with loading=true
   page.tsx receives loading=true → shows its own spinner or content
   loading resolves → page.tsx reacts and updates accordingly */