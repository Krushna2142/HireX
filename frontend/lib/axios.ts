import axios from 'axios';
import { supabase } from '@/lib/supabase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 🔥 Request Interceptor
api.interceptors.request.use(
  async (config) => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;