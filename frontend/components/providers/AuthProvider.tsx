'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  UserRole,
  AuthResponse,
  getMe,
  logout as authLogout,
  register as authRegister,
  login as authLogin,
  forgotPassword as authForgotPassword,
  roleRedirectPath,
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
  register: (
    fullName: string,
    email: string,
    password: string,
    role: UserRole,
  ) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<string>;
  redirectPath: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  refresh: async () => {},
  logout: () => {},
  register: async () => { throw new Error('Not initialized'); },
  login: async () => { throw new Error('Not initialized'); },
  forgotPassword: async () => { throw new Error('Not initialized'); },
  redirectPath: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const logout = () => {
    setUser(null);
    authLogout();
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<AuthResponse> => {
    const data = await authRegister(fullName, email, password, role);
    setUser(data.user);
    return data;
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const data = await authLogin(email, password);
    setUser(data.user);
    return data;
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await authForgotPassword(email);
    return res.message || 'Check your email for reset instructions.';
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      refresh,
      logout,
      register,
      login,
      forgotPassword,
      redirectPath: user ? roleRedirectPath(user.role) : null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);