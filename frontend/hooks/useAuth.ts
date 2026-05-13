'use client';

import { useAuth as useProviderAuth } from '@/components/providers/AuthProvider';

export const useAuth = () => {
  const auth = useProviderAuth();

  return {
    user: auth.user,
    loading: auth.loading,
    error: null,

    login: async (email: string, password: string) => {
      await auth.login(email, password);
    },

    signup: async (email: string, password: string, fullName: string) => {
      await auth.register(fullName, email, password, 'candidate');
    },

    logout: async () => {
      await auth.logout();
    },

    isAuthenticated: !!auth.user,
  };
};