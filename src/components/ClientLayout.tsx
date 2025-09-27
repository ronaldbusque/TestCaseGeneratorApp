'use client';

import { NetworkBackground } from '@/components/NetworkBackground';
import { NavigationBar } from '@/components/NavigationBar';
import { Footer } from '@/components/Footer';
import { ProviderSettingsProvider } from '@/lib/context/ProviderSettingsContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProviderSettingsProvider>
      <div className="relative min-h-screen flex flex-col">
        {/* Persistent NetworkBackground that won't reload between page navigations */}
        <NetworkBackground />
        <NavigationBar />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </div>
    </ProviderSettingsProvider>
  );
}
