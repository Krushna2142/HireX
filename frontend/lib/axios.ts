import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 🔥 Request Interceptor
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔥 Response Interceptor — clear stale token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;