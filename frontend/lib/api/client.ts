export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
    cache: 'no-store',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data && (data.error || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = params
    ? '?' +
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const resp = await fetch(`${API_BASE}${path}${qs}`, { cache: 'no-store' });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data && (data.error || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}

export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, { method: 'POST', body: form, cache: 'no-store' });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data && (data.error || data.detail)) || `Request failed: ${resp.status}`);
  return data as T;
}