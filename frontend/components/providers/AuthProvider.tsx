'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (full_name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setToken(storedToken);
            setUser(data);
          } else {
            localStorage.removeItem('auth_token');
          }
        })
        .catch(() => localStorage.removeItem('auth_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (full_name: string, email: string, password: string, role: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, role }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider missing');
  return context;
}