const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'jc_token';

export interface User {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ── Token helpers ─────────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Helper to build an Error that carries status/body ─────────────────────────
function buildHttpError(status: number, body: any) {
  const e = new Error(body?.message || 'Request failed');
  (e as any).status = status;
  (e as any).body = body;
  return e;
}

// ── API calls ─────────────────────────────────────────────────────────────────
export async function register(
  full_name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, password }),
  });

  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: 'Registration failed' };
    }
    throw buildHttpError(res.status, errBody);
  }

  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: 'Login failed' };
    }
    throw buildHttpError(res.status, errBody);
  }

  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  // endpoint intentionally returns a neutral message regardless of existence
  return res.json();
}

export async function resetPassword(
  token: string,
  new_password: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password }),
  });

  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: 'Reset failed' };
    }
    throw buildHttpError(res.status, errBody);
  }

  return res.json();
}

export async function getMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    removeToken();
    return null;
  }

  return res.json();
}

export function logout() {
  removeToken();
  window.location.href = '/';
}