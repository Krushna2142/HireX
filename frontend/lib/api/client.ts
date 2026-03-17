// frontend/lib/api/client.ts
// Legacy client kept for any files still importing from here.
// All new code should use @/lib/axios instead.
// This version reads jc_token and attaches the auth header automatically.

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('jc_token') : null;

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    ...init,
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error((data && (data.error || data.message || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const qs = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const resp = await fetch(`${API_BASE}${path}${qs}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error((data && (data.error || data.message || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },  // no Content-Type — browser sets multipart boundary
    body: form,
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok)
    throw new Error((data && (data.error || data.message || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}