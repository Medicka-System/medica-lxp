import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SerwistProvider } from '@serwist/next/react';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Campus Virtual · Médica Capacitación',
  description:
    'LXP para médicos de ultrasonido diagnóstico y POCUS. Teoría, práctica (casos DICOM), comunidad y competencia.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Campus LXP',
};

export const viewport: Viewport = {
  themeColor: '#0f2d52',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV !== 'production'}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
