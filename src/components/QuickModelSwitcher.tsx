'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { LLMProvider, QuickSelection } from '@/lib/types/providers';
import Link from 'next/link';

const DOMAIN_LABELS: Record<'testCases' | 'sql' | 'data', string> = {
  testCases: 'Test Case Generator',
  sql: 'SQL Assistant',
  data: 'Test Data Generator',
};

interface QuickModelSwitcherProps {
  domain: 'testCases' | 'sql' | 'data';
  className?: string;
}

export function QuickModelSwitcher({ domain, className }: QuickModelSwitcherProps) {
  const {
    settings,
    availableProviders,
    quickSelections,
    applyQuickSelection,
    loading,
  } = useProviderSettings();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const domainSelection = settings[domain];

  const providerLabel = useMemo(() => {
    const provider = availableProviders.find((item) => item.id === domainSelection.provider);
    return provider?.label ?? domainSelection.provider;
  }, [availableProviders, domainSelection.provider]);

  const formattedSelectionLabel = `${providerLabel} · ${domainSelection.model}`;

  const formattedQuickSelections = useMemo(() => {
    return quickSelections.map((selection) => {
      const provider = availableProviders.find((item) => item.id === selection.provider);
      const label = selection.label?.trim()
        ? selection.label.trim()
        : `${provider?.label ?? selection.provider.toUpperCase()} · ${selection.model}`;
      const helper = `${provider?.label ?? selection.provider} · ${selection.model}`;
      return {
        ...selection,
        displayLabel: label,
        helper,
      };
    });
  }, [quickSelections, availableProviders]);

  const handleSelect = (selection: QuickSelection) => {
    applyQuickSelection(domain, selection.id);
    setOpen(false);
  };

  const menuContent = () => {
    if (loading) {
      return <p className="text-xs text-blue-200">Loading providers…</p>;
    }

    if (!formattedQuickSelections.length) {
      return (
        <p className="text-xs text-blue-200/80">
          No quick selections yet.
          {' '}
          <Link href="/settings" className="text-blue-300 hover:text-blue-100 underline">
            Configure in settings
          </Link>
          .
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {formattedQuickSelections.map((selection) => (
          <button
            type="button"
            key={selection.id}
            onClick={() => handleSelect(selection)}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-blue-100 hover:bg-white/10 transition"
          >
            <div className="font-medium">{selection.displayLabel}</div>
            <div className="text-xs text-blue-200/80">{selection.helper}</div>
          </button>
        ))}
        <div className="mt-2 text-[0.65rem] text-blue-300/70">
          Manage quick selections in{' '}
          <Link href="/settings" className="underline hover:text-blue-100">
            Provider Settings
          </Link>
          .
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className ?? ''}`}>
      <span className="text-xs uppercase tracking-wide text-blue-200/60 block mb-1">
        {DOMAIN_LABELS[domain]}
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-white/10 transition"
      >
        <span>{loading ? 'Loading…' : formattedSelectionLabel}</span>
        <svg
          className={`h-4 w-4 text-blue-200 transition-transform ${open ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl">
          {menuContent()}
        </div>
      )}
    </div>
  );
}
