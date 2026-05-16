import { Suspense } from 'react';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import AnalyticsTracker from '@/components/AnalyticsTracker';

config.autoAddCss = false;

export const metadata = {
  title: 'RepFinder - Najlepsza wyszukiwarka repów',
  description: 'Znajdź najlepsze repliki w sieci.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <link rel="icon" href="/images/rf-logo-removebg-preview.png" type="image/png" />
      </head>
      <body>
        <AuthProvider>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <LanguageProvider>
            <Navbar />
            <main>
              {children}
            </main>
            <Footer />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}