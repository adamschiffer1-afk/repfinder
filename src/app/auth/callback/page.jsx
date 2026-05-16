'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/CallbackPage.module.css';
import DOMPurify from 'dompurify';

function CallbackContent() {
  const { login, fetchWithAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (hasRun.current) return;
      hasRun.current = true;

      console.log('CallbackPage handleCallback called');
      const code = searchParams.get('code');
      if (!code || !/^[a-zA-Z0-9-_]+$/.test(code)) {
        setError(DOMPurify.sanitize('Nieprawidłowy kod autoryzacji'));
        localStorage.removeItem('loginStatus');
        console.error('Invalid authorization code');
        return;
      }

      try {
        localStorage.setItem('loginStatus', 'pending');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetchWithAuth('/api/auth/discord/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.success) {
          const { user } = data;
          if (typeof user.username !== 'string' || !user.username) {
            throw new Error('Nieprawidłowe dane użytkownika');
          }
          login(user);
          console.log('User logged in:', user.username);
          router.push(`/profile/${DOMPurify.sanitize(user.username)}`);
        } else {
          setError(DOMPurify.sanitize(data.message || 'Błąd autoryzacji'));
          console.error('Callback response error:', data);
          localStorage.removeItem('loginStatus');
        }
      } catch (err) {
        setError(DOMPurify.sanitize(err.message || 'Wystąpił błąd podczas autoryzacji'));
        console.error('Callback error:', err);
        localStorage.removeItem('loginStatus');
      }
    };

    handleCallback();
  }, [searchParams, login, fetchWithAuth, router]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorAlert}>
          <h3 className={styles.errorTitle}>Błąd</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button
            className={styles.retryButton}
            onClick={() => router.push('/')}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Przetwarzanie autoryzacji...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Ładowanie...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}