import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

// Metadata needs to be exported from a server component, so we define it outside the client component
export const metadata: Metadata = {
  title: 'QualityForge AI - Testing Tools Suite',
  description: 'AI-powered tools for test case generation, SQL assistance, and more',
  icons: {
    icon: '/favicon.svg',
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-900`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
