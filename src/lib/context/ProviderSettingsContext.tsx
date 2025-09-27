'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchApi } from '@/lib/utils/apiClient';
import {
  LLMProvider,
  ProviderDescriptor,
  ProviderSettings,
} from '@/lib/types/providers';
import {
  DEFAULT_SETTINGS,
  FALLBACK_MODELS,
  buildDefaultSettings,
  ensureSettingsFallback,
} from '@/lib/providerSettings';

interface ProviderSettingsContextValue {
  settings: ProviderSettings;
  availableProviders: ProviderDescriptor[];
  updateProvider: (domain: keyof ProviderSettings, provider: LLMProvider) => void;
  updateModel: (domain: keyof ProviderSettings, model: string) => void;
  resetSettings: () => void;
  loading: boolean;
}

const ProviderSettingsContext = createContext<ProviderSettingsContextValue | undefined>(undefined);

export function ProviderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_SETTINGS);
  const [availableProviders, setAvailableProviders] = useState<ProviderDescriptor[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/providers');
        if (!response.ok) {
          throw new Error(`Failed to fetch providers: ${response.status}`);
        }
        const data = await response.json();
        setAvailableProviders(data.providers ?? []);
      } catch (error) {
        console.error('Failed to fetch providers', error);
        setAvailableProviders([]);
      } finally {
        setProvidersLoaded(true);
      }
    };

    loadProviders();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchApi('/api/provider-settings');
        if (data?.settings) {
          setSettings(data.settings as ProviderSettings);
        }
      } catch (error) {
        console.error('Failed to fetch provider settings', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setHasLoadedSettings(true);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (providersLoaded && hasLoadedSettings) {
      setLoading(false);
    }
  }, [providersLoaded, hasLoadedSettings]);

  useEffect(() => {
    if (!hasLoadedSettings) return;

    const persistSettings = async () => {
      try {
        await fetchApi('/api/provider-settings', {
          method: 'POST',
          body: JSON.stringify(settings),
        });
      } catch (error) {
        console.error('Failed to persist provider settings', error);
      }
    };

    persistSettings();
  }, [settings, hasLoadedSettings]);

  useEffect(() => {
    if (!hasLoadedSettings) return;
    setSettings((prev) => ensureSettingsFallback(prev, availableProviders));
  }, [availableProviders, hasLoadedSettings]);

  const updateProvider = useCallback(
    (domain: keyof ProviderSettings, providerId: LLMProvider) => {
      setSettings((prev) => {
        const descriptor = availableProviders.find((p) => p.id === providerId);
        const defaultModel = descriptor?.defaultModel ?? FALLBACK_MODELS[providerId];
        return {
          ...prev,
          [domain]: { provider: providerId, model: defaultModel },
        };
      });
    },
    [availableProviders]
  );

  const updateModel = useCallback((domain: keyof ProviderSettings, model: string) => {
    setSettings((prev) => ({
      ...prev,
      [domain]: {
        provider: prev[domain].provider,
        model,
      },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(buildDefaultSettings(availableProviders));
  }, [availableProviders]);

  const value = useMemo<ProviderSettingsContextValue>(
    () => ({ settings, availableProviders, updateProvider, updateModel, resetSettings, loading }),
    [settings, availableProviders, updateProvider, updateModel, resetSettings, loading]
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
