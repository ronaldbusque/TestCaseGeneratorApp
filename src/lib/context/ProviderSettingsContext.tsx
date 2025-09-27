'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LLMProvider, ProviderDescriptor, ProviderSettings } from '@/lib/types/providers';

interface ProviderSettingsContextValue {
  settings: ProviderSettings;
  availableProviders: ProviderDescriptor[];
  updateSetting: (domain: keyof ProviderSettings, provider: LLMProvider) => void;
  resetSettings: () => void;
  loading: boolean;
}

const DEFAULT_SETTINGS: ProviderSettings = {
  testCases: 'openai',
  sql: 'openai',
  data: 'openai',
};

const STORAGE_KEY = 'qualityforge-provider-settings';

const ProviderSettingsContext = createContext<ProviderSettingsContextValue | undefined>(undefined);

export function ProviderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_SETTINGS);
  const [availableProviders, setAvailableProviders] = useState<ProviderDescriptor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ProviderSettings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load provider settings from storage', error);
    }
  }, []);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/providers');
        if (!response.ok) {
          throw new Error(`Failed to load providers: ${response.status}`);
        }
        const data = await response.json();
        const providers: ProviderDescriptor[] = data.providers ?? [];
        setAvailableProviders(providers);
        setSettings((prev) => ensureSettingsFallback(prev, providers));
      } catch (error) {
        console.error(error);
        const fallback: ProviderDescriptor[] = [
          { id: 'openai', label: 'OpenAI (Agents)' },
        ];
        setAvailableProviders(fallback);
        setSettings((prev) => ensureSettingsFallback(prev, fallback));
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to persist provider settings', error);
    }
  }, [settings, loading]);

  const updateSetting = useCallback((domain: keyof ProviderSettings, provider: LLMProvider) => {
    setSettings((prev) => ({ ...prev, [domain]: provider }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(ensureSettingsFallback(DEFAULT_SETTINGS, availableProviders));
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear provider settings from storage', error);
    }
  }, [availableProviders]);

  const value = useMemo<ProviderSettingsContextValue>(
    () => ({ settings, availableProviders, updateSetting, resetSettings, loading }),
    [settings, availableProviders, loading, updateSetting, resetSettings]
  );

  return (
    <ProviderSettingsContext.Provider value={value}>
      {children}
    </ProviderSettingsContext.Provider>
  );
}

export function useProviderSettings(): ProviderSettingsContextValue {
  const context = useContext(ProviderSettingsContext);
  if (!context) {
    throw new Error('useProviderSettings must be used within ProviderSettingsProvider');
  }
  return context;
}

function ensureSettingsFallback(
  current: ProviderSettings,
  providers: ProviderDescriptor[],
): ProviderSettings {
  if (!providers.length) {
    return current;
  }

  const providerIds = new Set(providers.map((p) => p.id));
  const fallback = providers[0].id;

  const normalize = (value: LLMProvider): LLMProvider => (
    providerIds.has(value) ? value : fallback
  );

  return {
    testCases: normalize(current.testCases),
    sql: normalize(current.sql),
    data: normalize(current.data),
  };
}
