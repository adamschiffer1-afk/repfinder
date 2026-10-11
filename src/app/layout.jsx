import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import '@/styles/focus.css';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PageTransition from '@/components/PageTransition';
import TopLoadingBar from '@/components/TopLoadingBar';
import UserWidget from '@/components/UserWidget';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MobileNav from '@/components/MobileNav';
import { ToastProvider } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';

config.autoAddCss = false;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata = {
  metadataBase: new URL('https://repfinder.xyz'),
  title: 'RepFinder | Premium Products & Tools Hub',
  description: 'The ultimate hub for finding premium quality products, tracking packages globally, inspecting QC photos, and converting agent links instantly.',
  keywords: ['RepFinder', 'agent links', 'weidian', 'taobao', '1688', 'package tracking', 'qc photos', 'link converter', 'premium products'],
  openGraph: {
    title: 'RepFinder | Premium Products & Tools Hub',
    description: 'Find premium products, track your packages globally, check QC photos, and convert links effortlessly.',
    url: 'https://repfinder.xyz',
    siteName: 'RepFinder',
    images: [
      {
        url: '/images/nowelogo.png',
        width: 800,
        height: 600,
        alt: 'RepFinder Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <link rel="icon" href="/images/nowelogo.png" type="image/png" />
      </head>
      <body className={inter.variable}>
        <ErrorBoundary>
          <SessionProviderWrapper>
            <AuthProvider>
              <ToastProvider>
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
                <TopLoadingBar />
                <LanguageProvider>
                  <Navbar />
                  <UserWidget />
                  <MobileNav />
                  <PageTransition>
                    <main>
                      {children}
                    </main>
                  </PageTransition>
                  <Footer />
                </LanguageProvider>
              </ToastProvider>
            </AuthProvider>
          </SessionProviderWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
