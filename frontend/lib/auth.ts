/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'jc_token';

export type UserRole = 'candidate' | 'recruiter';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
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

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function roleRedirectPath(role: UserRole): string {
  return role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard';
}

// ── Error builder ─────────────────────────────────────────────────────────────

function buildHttpError(status: number, body: any): Error {
  const e = new Error(body?.message || 'Request failed');
  (e as any).status = status;
  (e as any).body = body;
  return e;
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  let body: any = null;
  try { body = await res.json(); } catch { body = { message: fallback }; }
  return buildHttpError(res.status, body);
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function register(
  full_name: string,
  email: string,
  password: string,
  role: UserRole,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, password, role }),
  });

  if (!res.ok) throw await parseError(res, 'Registration failed');

  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw await parseError(res, 'Login failed');

  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(
  token: string,
  new_password: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password }),
  });

  if (!res.ok) throw await parseError(res, 'Reset failed');
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

export function logout(): void {
  removeToken();
  window.location.href = '/';
}