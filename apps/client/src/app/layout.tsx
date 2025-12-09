import { Lato } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { ModalManager } from '@/components/modal-manager';
import { Toaster } from '@/components/ui/toaster';
import { populateMetadata } from '@/utils/metadata';
import { Header } from './(header)';
import { Providers } from './providers';

const poetsenOne = localFont({
  src: './fonts/PoetsenOne-Regular.ttf',
  variable: '--font-poetsen-one',
  weight: '100 900',
});

const lato = Lato({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-lato',
});

export const generateMetadata = () => {
  return populateMetadata({
    canonicalPath: '/',
  });
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en">
        <body className={`${poetsenOne.variable} ${lato.variable} antialiased`}>
          <Script
            id="ga-analytics"
            strategy="afterInteractive"
            src="https://www.googletagmanager.com/gtag/js?id=G-F1BF8KT9R6"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag() {dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', 'G-F1BF8KT9R6');
            `}
          </Script>
          <Header />
          {children}
          <Toaster />
          <ModalManager />
          <Analytics />
        </body>
      </html>
    </Providers>
  );
}
