/* eslint-disable @typescript-eslint/no-explicit-any */

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const API_URL = RAW_API_URL.replace(/\/$/, '');

const TOKEN_KEY = 'jc_token';
const LEGACY_TOKEN_KEY = 'jc_access_token';
const REFRESH_TOKEN_KEY = 'jc_refresh_token';

export type NormalizedUserRole =
  | 'candidate'
  | 'recruiter'
  | 'admin'
  | 'super_admin';

export type UserRole =
  | NormalizedUserRole
  | 'JOBSEEKER'
  | 'RECRUITER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type PublicAuthRole = 'candidate' | 'recruiter';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: NormalizedUserRole;
  created_at: string;
  email_verified?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  accessExpiresAt?: string | Date;
  refreshExpiresAt?: string | Date;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  accessExpiresAt?: string | Date;
  refreshExpiresAt?: string | Date;
}

export type ResetPasswordPayload = {
  token?: string;
  email?: string;
  code?: string;
  password?: string;
  new_password?: string;
};

export function normalizeRole(role: UserRole | string): NormalizedUserRole {
  switch (role) {
    case 'JOBSEEKER':
    case 'candidate':
      return 'candidate';

    case 'RECRUITER':
    case 'recruiter':
      return 'recruiter';

    case 'ADMIN':
    case 'admin':
      return 'admin';

    case 'SUPER_ADMIN':
    case 'super_admin':
      return 'super_admin';

    default:
      return 'candidate';
  }
}

function normalizeUser(raw: any): User {
  return {
    id: raw?.id ?? '',
    full_name: raw?.full_name ?? raw?.fullName ?? '',
    email: raw?.email ?? '',
    role: normalizeRole(raw?.role),
    created_at: raw?.created_at ?? raw?.createdAt ?? new Date().toISOString(),
    email_verified: raw?.email_verified ?? raw?.emailVerified ?? false,
  };
}

function normalizeAuthResponse(raw: any): AuthResponse {
  if (!raw?.accessToken) {
    throw new Error('Auth response missing accessToken');
  }

  if (!raw?.refreshToken) {
    throw new Error('Auth response missing refreshToken');
  }

  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    accessExpiresAt: raw.accessExpiresAt,
    refreshExpiresAt: raw.refreshExpiresAt,
    user: normalizeUser(raw.user),
  };
}

export function roleRedirectPath(role: UserRole | string): string {
  const normalized = normalizeRole(role);

  if (normalized === 'admin' || normalized === 'super_admin') {
    return '/admin/dashboard';
  }

  return '/dashboard';
}

// ── Token Management ────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY)
  );
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setAuthCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;

  const secure = process.env.NODE_ENV === 'production' ? ';Secure' : '';
  const maxAge = 60 * 60 * 24 * 7;

  document.cookie = `${name}=${value};path=/;SameSite=Lax;max-age=${maxAge}${secure}`;
}

function clearAuthCookie(name: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=;path=/;max-age=0`;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  setAuthCookie(TOKEN_KEY, accessToken);
  setAuthCookie(LEGACY_TOKEN_KEY, accessToken);
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }

  setAuthCookie(TOKEN_KEY, token);
  setAuthCookie(LEGACY_TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  clearAuthCookie(TOKEN_KEY);
  clearAuthCookie(LEGACY_TOKEN_KEY);
  clearAuthCookie(REFRESH_TOKEN_KEY);
}

async function parseError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));

  return new Error(body?.message || body?.error || fallback);
}

// ── Auth API Functions ──────────────────────────────────────────────────────

export async function register(
  full_name: string,
  email: string,
  password: string,
  role: PublicAuthRole = 'candidate',
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name,
      email: email.trim().toLowerCase(),
      password,
      role,
    }),
  });

  if (!res.ok) {
    throw await parseError(res, 'Registration failed');
  }

  const data = normalizeAuthResponse(await res.json());

  setTokens(data.accessToken, data.refreshToken);

  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (!res.ok) {
    throw await parseError(res, 'Login failed');
  }

  const data = normalizeAuthResponse(await res.json());

  setTokens(data.accessToken, data.refreshToken);

  return data;
}

export async function logout(): Promise<void> {
  const token = getToken();

  try {
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch {
    console.warn('Backend logout failed, clearing local auth state.');
  } finally {
    removeToken();
  }
}

export async function refreshAccessToken(): Promise<RefreshResponse> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    removeToken();
    throw new Error('No refresh token found');
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken,
    }),
  });

  if (!res.ok) {
    removeToken();
    throw await parseError(res, 'Session expired');
  }

  const raw = await res.json();

  if (!raw?.accessToken) {
    removeToken();
    throw new Error('Refresh response missing accessToken');
  }

  const refreshed: RefreshResponse = {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    accessExpiresAt: raw.accessExpiresAt,
    refreshExpiresAt: raw.refreshExpiresAt,
    user: normalizeUser(raw.user),
  };

  setTokens(refreshed.accessToken, refreshed.refreshToken || refreshToken);

  return refreshed;
}

export async function getMe(): Promise<User | null> {
  const token = getToken();

  if (!token) {
    return null;
  }

  let res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    try {
      const refreshed = await refreshAccessToken();

      res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${refreshed.accessToken}`,
        },
      });
    } catch {
      removeToken();
      return null;
    }
  }

  if (!res.ok) {
    removeToken();
    return null;
  }

  const raw = await res.json();

  return normalizeUser(raw.user ?? raw);
}

// ── Password Reset ──────────────────────────────────────────────────────────

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
    }),
  });

  if (!res.ok) {
    throw await parseError(res, 'Failed to send reset email');
  }

  return res.json();
}

/**
 * Supports all current frontend calls:
 *
 * resetPassword(token, password)
 * resetPassword({ token, password })
 * resetPassword({ token, new_password })
 * resetPassword({ email, code, password })
 *
 * Sends both old/new fields to backend:
 * - token
 * - email
 * - code
 * - password
 * - new_password
 */
export async function resetPassword(
  tokenOrPayload: string | ResetPasswordPayload,
  passwordArg?: string,
): Promise<{ message: string }> {
  const payload =
    typeof tokenOrPayload === 'string'
      ? {
          token: tokenOrPayload,
          password: passwordArg,
        }
      : tokenOrPayload;

  const token = payload.token?.trim();
  const email = payload.email?.trim().toLowerCase();
  const code = payload.code?.trim();
  const newPassword = payload.new_password ?? payload.password;

  if (!token && !email) {
    throw new Error('Email is required when using reset code.');
  }

  if (!token && !code) {
    throw new Error('Reset code is required.');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      email,
      code,
      password: newPassword,
      new_password: newPassword,
    }),
  });

  if (!res.ok) {
    throw await parseError(res, 'Reset failed');
  }

  return res.json();
}