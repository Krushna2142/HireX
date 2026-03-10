'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type User = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (full_name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, new_password: string) => Promise<string>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('jc_token');
    if (stored) {
      setToken(stored);
      fetchMe(stored);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchMe(jwt: string) {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(jwt);
      } else {
        localStorage.removeItem('jc_token');
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem('jc_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  const register = useCallback(async (full_name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    localStorage.setItem('jc_token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    localStorage.setItem('jc_token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jc_token');
    setToken(null);
    setUser(null);
    router.push('/');
  }, [router]);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed');
    return data.message;
  }, []);

  const resetPassword = useCallback(async (resetToken: string, new_password: string) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, new_password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed');
    return data.message;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, register, login, logout, forgotPassword, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider missing');
  return context;
}