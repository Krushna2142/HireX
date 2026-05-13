/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'jc_access_token';
const REFRESH_TOKEN_KEY = 'jc_refresh_token';

export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
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

export function roleRedirectPath(role: UserRole): string {
  if (role === 'admin') return '/admin/dashboard';
  return '/dashboard';
}

// ── Token Management ────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  // Also set cookie for middleware (optional)
  if (typeof document !== 'undefined') {
    const secure = process.env.NODE_ENV === 'production' ? ';Secure' : '';
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `${TOKEN_KEY}=${accessToken};path=/;SameSite=Strict;max-age=${maxAge}${secure}`;
  }
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (typeof document !== 'undefined') {
    const secure = process.env.NODE_ENV === 'production' ? ';Secure' : '';
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `${TOKEN_KEY}=${token};path=/;SameSite=Strict;max-age=${maxAge}${secure}`;
  }
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  if (typeof document !== 'undefined') {
    document.cookie = `${TOKEN_KEY}=;path=/;max-age=0`;
    document.cookie = `${REFRESH_TOKEN_KEY}=;path=/;max-age=0`;
  }
}

// ── API Helpers ─────────────────────────────────────────────────────────────

async function parseError(res: Response, fallback: string): Promise<Error> {
  let body: any = null;
  try { body = await res.json(); } catch { body = { message: fallback }; }
  const err = new Error(body?.message || fallback);
  (err as any).status = res.status;
  (err as any).body = body;
  return err;
}

// ── Refresh Token ───────────────────────────────────────────────────────────

export async function refreshAccessToken(): Promise<RefreshResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      removeToken();
      throw await parseError(res, 'Session expired');
    }

    const data: RefreshResponse = await res.json();
    // Update access token (refresh token may be same or new)
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    
    if (typeof document !== 'undefined') {
      const secure = process.env.NODE_ENV === 'production' ? ';Secure' : '';
      document.cookie = `${TOKEN_KEY}=${data.accessToken};path=/;SameSite=Strict;max-age=${60 * 60 * 24 * 7}${secure}`;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      removeToken();
      throw new Error('Token refresh timeout');
    }
    throw error;
  }
}

// ── Auth API Functions ──────────────────────────────────────────────────────

export async function register(
  full_name: string,
  email: string,
  password: string,
  role: Exclude<UserRole, 'admin'>,
): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, role }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw await parseError(res, 'Registration failed');
    const data: AuthResponse = await res.json();
    
    // Validate response has required fields
    if (!data.accessToken || !data.refreshToken || !data.user) {
      throw new Error('Invalid auth response: missing tokens or user');
    }
    
    setTokens(data.accessToken, data.refreshToken);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Registration timeout');
    }
    throw error;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw await parseError(res, 'Login failed');
    const data: AuthResponse = await res.json();
    
    // Validate response has required fields
    if (!data.accessToken || !data.refreshToken || !data.user) {
      throw new Error('Invalid auth response: missing tokens or user');
    }
    
    setTokens(data.accessToken, data.refreshToken);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Login timeout');
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (error) {
      // Logout should always succeed client-side
      console.warn('Backend logout failed, clearing local state:', error instanceof Error ? error.message : String(error));
    }
  }
  removeToken();
}

export async function getMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Try refresh if 401
      if (res.status === 401) {
        try {
          const refreshed = await refreshAccessToken();
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 8000);

          const retryRes = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${refreshed.accessToken}` },
            signal: retryController.signal,
          });

          clearTimeout(retryTimeoutId);

          if (retryRes.ok) return retryRes.json();
        } catch (error) {
          console.warn('Token refresh or retry failed:', error instanceof Error ? error.message : String(error));
        }
      }
      removeToken();
      return null;
    }
    
    const user = await res.json();
    
    // Validate user object has required fields
    if (!user?.id || !user?.email || !user?.role) {
      console.error('Invalid user object from /auth/me:', user);
      removeToken();
      return null;
    }
    
    return user;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('getMe timeout:', error.message);
    } else {
      console.error('getMe error:', error instanceof Error ? error.message : String(error));
    }
    removeToken();
    return null;
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw await parseError(res, 'Reset failed');
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
