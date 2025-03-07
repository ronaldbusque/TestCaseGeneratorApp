'use client';

import { NetworkBackground } from '@/components/NetworkBackground';
import { NavigationBar } from '@/components/NavigationBar';
import { Footer } from '@/components/Footer';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Persistent NetworkBackground that won't reload between page navigations */}
      <NetworkBackground />
      <NavigationBar />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
} 