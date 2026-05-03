/* eslint-disable @typescript-eslint/no-explicit-any */
import { getToken, refreshAccessToken, removeToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  requireAuth?: boolean;
};

/**
 * Enhanced fetch wrapper with automatic token refresh.
 * 
 * Usage:
 *   import { apiClient } from '@/lib/api-client';
 *   const data = await apiClient.get('/jobs');
 *   const result = await apiClient.post('/applications', { jobId: '123' });
 */
class ApiClient {
  private refreshPromise: Promise<any> | null = null;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { requireAuth = true, headers = {}, ...rest } = options;

    // Add auth header if required
    if (requireAuth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Default headers
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    let res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...rest,
      headers: defaultHeaders,
    });

    // Handle 401 - try refresh
    if (res.status === 401 && requireAuth) {
      if (!this.refreshPromise) {
        this.refreshPromise = refreshAccessToken().catch((err) => {
          this.refreshPromise = null;
          throw err;
        });
      }

      try {
        const refreshed = await this.refreshPromise;
        this.refreshPromise = null;

        // Retry with new token
        headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
        res = await fetch(`${this.baseUrl}${endpoint}`, {
          ...rest,
          headers: { ...defaultHeaders, ...headers },
        });
      } catch {
        this.refreshPromise = null;
        removeToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/?auth=login&error=session_expired';
        }
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err: any = new Error(body?.message || 'Request failed');
      err.status = res.status;
      err.body = body;
      throw err;
    }

    // Handle 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json();
  }

  get<T = any>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T = any>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T = any>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T = any>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE);