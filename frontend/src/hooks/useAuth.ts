import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

export function useAuth() {
  const { user, isAuthenticated, login, logout, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setLoading(false);
    };

    initAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };
}