'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect, useMemo } from 'react';
import {
  BeakerIcon,
  DocumentCheckIcon,
  CommandLineIcon,
  TableCellsIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

type NavItem = {
  href: string;
  label: string;
  icon: typeof DocumentCheckIcon;
  hideLabel?: boolean;
  iconClass?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Test Case Generator', icon: DocumentCheckIcon, iconClass: 'h-8 w-8' },
  { href: '/sql', label: 'SQL Assistant', icon: CommandLineIcon, iconClass: 'h-8 w-8' },
  { href: '/data-generator', label: 'Test Data Generator', icon: TableCellsIcon, iconClass: 'h-8 w-8' },
  { href: '/settings', label: 'Settings', icon: Cog6ToothIcon, hideLabel: true, iconClass: 'h-6 w-6' },
];

export const NavigationBar = () => {
  const pathname = usePathname();
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [savedAccessToken, setSavedAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('appAccessToken');
    if (storedToken) {
      setAccessTokenInput(storedToken);
      setSavedAccessToken(storedToken);
    }
  }, []);

  const handleSaveToken = () => {
    if (!accessTokenInput?.trim()) return;
    localStorage.setItem('appAccessToken', accessTokenInput.trim());
    setSavedAccessToken(accessTokenInput.trim());
  };

  const navLinks = useMemo(() => NAV_ITEMS, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 shadow-sm transition hover:bg-white/10">
            <BeakerIcon className="h-8 w-8 text-blue-400" />
            <span className="hidden whitespace-nowrap text-lg font-semibold text-white sm:inline">QualityForge AI</span>
          </Link>

          <div className="hidden items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 sm:flex">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const iconClass = item.iconClass ?? 'h-6 w-6';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white shadow'
                      : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={iconClass} />
                  {item.hideLabel ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 shadow-inner sm:flex">
            <span className="text-xs uppercase tracking-wide text-blue-100/60">Access Token</span>
            <input
              type="password"
              placeholder="••••••••"
              value={accessTokenInput}
              onChange={(event) => setAccessTokenInput(event.target.value)}
              className="w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-white placeholder:text-blue-200/50 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              aria-label="Access token"
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="bg-blue-600/90 px-4 text-white shadow hover:bg-blue-600"
            onClick={handleSaveToken}
            disabled={!accessTokenInput || accessTokenInput === savedAccessToken}
          >
            {savedAccessToken ? 'Update Token' : 'Save Token'}
          </Button>
        </div>
      </div>
    </nav>
  );
};
