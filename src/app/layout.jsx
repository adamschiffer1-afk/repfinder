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
        url: '/images/rf-logo-removebg-preview.png',
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