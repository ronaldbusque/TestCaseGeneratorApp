'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  LLMProvider,
  ProviderDescriptor,
  ProviderSelection,
  ProviderSettings,
} from '@/lib/types/providers';

interface ProviderSettingsContextValue {
  settings: ProviderSettings;
  availableProviders: ProviderDescriptor[];
  updateProvider: (domain: keyof ProviderSettings, provider: LLMProvider) => void;
  updateModel: (domain: keyof ProviderSettings, model: string) => void;
  resetSettings: () => void;
  loading: boolean;
}

const FALLBACK_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-1.5-pro-latest',
  openrouter: 'openrouter/auto',
};

const DEFAULT_SETTINGS: ProviderSettings = {
  testCases: { provider: 'openai', model: FALLBACK_MODELS.openai },
  sql: { provider: 'openai', model: FALLBACK_MODELS.openai },
  data: { provider: 'openai', model: FALLBACK_MODELS.openai },
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
        const parsed = JSON.parse(stored);
        setSettings(coerceStoredSettings(parsed));
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
          {
            id: 'openai',
            label: 'OpenAI (Agents SDK)',
            supportsMultimodal: true,
            defaultModel: FALLBACK_MODELS.openai,
            baseUrl: 'https://api.openai.com',
          },
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

  const updateProvider = useCallback(
    (domain: keyof ProviderSettings, providerId: LLMProvider) => {
      setSettings((prev) => {
        const descriptor = availableProviders.find((p) => p.id === providerId);
        const defaultModel = descriptor?.defaultModel ?? FALLBACK_MODELS[providerId] ?? FALLBACK_MODELS.openai;
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear provider settings from storage', error);
    }
  }, [availableProviders]);

  const value = useMemo<ProviderSettingsContextValue>(
    () => ({ settings, availableProviders, updateProvider, updateModel, resetSettings, loading }),
    [settings, availableProviders, loading, updateProvider, updateModel, resetSettings]
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

function coerceStoredSettings(raw: any): ProviderSettings {
  const normalize = (selection: any, domain: keyof ProviderSettings): ProviderSelection => {
    if (selection && typeof selection === 'object' && 'provider' in selection) {
      const provider = isValidProvider(selection.provider) ? (selection.provider as LLMProvider) : 'openai';
      const model = typeof selection.model === 'string' && selection.model.trim()
        ? selection.model.trim()
        : FALLBACK_MODELS[provider] ?? FALLBACK_MODELS.openai;
      return { provider, model };
    }

    if (typeof selection === 'string' && isValidProvider(selection)) {
      const provider = selection as LLMProvider;
      return { provider, model: FALLBACK_MODELS[provider] };
    }

    return DEFAULT_SETTINGS[domain];
  };

  return {
    testCases: normalize(raw?.testCases, 'testCases'),
    sql: normalize(raw?.sql, 'sql'),
    data: normalize(raw?.data, 'data'),
  };
}

function ensureSettingsFallback(
  current: ProviderSettings,
  providers: ProviderDescriptor[],
): ProviderSettings {
  if (!providers.length) {
    return current;
  }

  const providerMap = new Map<LLMProvider, ProviderDescriptor>(
    providers.map((provider) => [provider.id, provider])
  );
  const fallbackProvider = providers[0];

  const normalize = (selection: ProviderSelection): ProviderSelection => {
    const providerId = providerMap.has(selection.provider)
      ? selection.provider
      : fallbackProvider.id;
    const descriptor = providerMap.get(providerId) ?? fallbackProvider;
    const model = selection.model?.trim()
      ? selection.model.trim()
      : descriptor.defaultModel ?? FALLBACK_MODELS[providerId] ?? FALLBACK_MODELS.openai;

    return {
      provider: providerId,
      model,
    };
  };

  return {
    testCases: normalize(current.testCases),
    sql: normalize(current.sql),
    data: normalize(current.data),
  };
}

function buildDefaultSettings(providers: ProviderDescriptor[]): ProviderSettings {
  if (!providers.length) {
    return DEFAULT_SETTINGS;
  }
  const fallback = providers[0];
  const providerMap = new Map<LLMProvider, ProviderDescriptor>(
    providers.map((provider) => [provider.id, provider])
  );

  const createSelection = (preferred: ProviderSelection): ProviderSelection => {
    const providerId = providerMap.has(preferred.provider)
      ? preferred.provider
      : fallback.id;
    const descriptor = providerMap.get(providerId) ?? fallback;
    const model = descriptor.defaultModel ?? FALLBACK_MODELS[providerId] ?? FALLBACK_MODELS.openai;
    return { provider: providerId, model };
  };

  return {
    testCases: createSelection(DEFAULT_SETTINGS.testCases),
    sql: createSelection(DEFAULT_SETTINGS.sql),
    data: createSelection(DEFAULT_SETTINGS.data),
  };
}

function isValidProvider(value: any): value is LLMProvider {
  return value === 'openai' || value === 'gemini' || value === 'openrouter';
}
