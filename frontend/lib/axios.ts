// frontend/lib/axios.ts
import axios from 'axios';

// NEXT_PUBLIC_API_URL already includes /api
// e.g. https://job-crawler-ts-api-t9r0.onrender.com/api
// So call sites just use: api.get('/resumes'), api.post('/auth/login') etc.
// DO NOT add /api in baseURL here or in call sites — it's already in the env var.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,  // ← no /api appended — already in the env var
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jc_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;