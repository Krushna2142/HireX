import axios from 'axios';
import { auth } from '@/lib/firebase/Client';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 🔥 Request Interceptor
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;

    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
