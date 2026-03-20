// lib/axios.ts — THE SINGLE HTTP CLIENT
// Every hook and page imports `api` from here.
// baseURL already includes /api — never append /api in call sites.

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT on every outbound request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401 — fires for EVERY request in the app
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