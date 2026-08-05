'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const initializeAuth = useCallback(async () => {
    console.log('initializeAuth called');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.success && data.user && typeof data.user.username === 'string') {
        setUser(data.user);
        console.log('User authenticated:', data.user.username);
      } else {
        setUser(null);
        console.log('No valid user data');
      }
    } catch (err) {
      console.error('Error verifying authentication:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('AuthProvider useEffect triggered');
    initializeAuth();
  }, [initializeAuth]);

  const fetchCsrfToken = useCallback(async () => {
    console.log('fetchCsrfToken called');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.csrfToken && typeof data.csrfToken === 'string' && data.csrfToken.length > 0) {
        console.log('CSRF token fetched:', data.csrfToken);
        return data.csrfToken;
      }
      throw new Error('Nieprawidłowy token CSRF');
    } catch (err) {
      console.error('CSRF token fetch error:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('logout called');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const csrfToken = await fetchCsrfToken();
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('Logout API called successfully, status:', response.status);
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('loginStatus');
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lastLoginAttemptTime');
      router.push('/');
      console.log('User logged out, redirected to /');
    }
  }, [fetchCsrfToken, router]);

  const fetchWithAuth = useCallback(
    async (url, options = {}, retries = 1) => {
      console.log('fetchWithAuth called:', url);
      const fullUrl = url.startsWith('http') ? url : `${url.startsWith('/') ? '' : '/'}${url}`;
      let csrfToken = null;
      if (['POST', 'PUT', 'DELETE'].includes(options.method?.toUpperCase())) {
        try {
          csrfToken = await fetchCsrfToken();
        } catch (err) {
          console.error('Failed to fetch CSRF token:', err);
          throw new Error('Nie udało się pobrać tokenu CSRF');
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        ...(options.headers || {}),
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(fullUrl, {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.status === 401 && retries > 0) {
          console.log('Attempting token refresh');
          try {
            const refreshController = new AbortController();
            const refreshTimeoutId = setTimeout(() => refreshController.abort(), 10000);
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await fetchCsrfToken() },
              credentials: 'include',
              signal: refreshController.signal,
            });
            clearTimeout(refreshTimeoutId);
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
              console.log('Token refreshed successfully');
              return fetchWithAuth(url, options, retries - 1);
            } else {
              console.error('Refresh failed:', refreshData.message);
              await logout();
              throw new Error(refreshData.message || 'Sesja wygasła. Zaloguj się ponownie.');
            }
          } catch (err) {
            console.error('Token refresh error:', err);
            await logout();
            throw err;
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Wystąpił błąd podczas żądania');
        }

        return response;
      } catch (err) {
        console.error('fetchWithAuth error:', err);
        throw err;
      }
    },
    [fetchCsrfToken, logout]
  );

  const login = useCallback(async (userData) => {
    console.log('login called:', userData?.username);
    if (userData && typeof userData.username === 'string') {
      setUser(userData);
      localStorage.removeItem('loginStatus');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, fetchWithAuth, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}