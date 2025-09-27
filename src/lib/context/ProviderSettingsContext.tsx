'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchApi } from '@/lib/utils/apiClient';
import {
  LLMProvider,
  ProviderDescriptor,
  ProviderSettings,
  QuickSelection,
} from '@/lib/types/providers';
import {
  DEFAULT_SETTINGS,
  FALLBACK_MODELS,
  buildDefaultSettings,
  ensureSettingsFallback,
  normalizeModelIdentifier,
} from '@/lib/providerSettings';

type DomainKey = 'testCases' | 'sql' | 'data';

const isValidProviderId = (value: any): value is LLMProvider =>
  value === 'openai' || value === 'gemini' || value === 'openrouter';

interface ProviderSettingsContextValue {
  settings: ProviderSettings;
  availableProviders: ProviderDescriptor[];
  quickSelections: QuickSelection[];
  updateProvider: (domain: DomainKey, provider: LLMProvider) => void;
  updateModel: (domain: DomainKey, model: string) => void;
  resetSettings: () => void;
  addQuickSelection: () => void;
  updateQuickSelection: (id: string, updates: Partial<QuickSelection>) => void;
  removeQuickSelection: (id: string) => void;
  applyQuickSelection: (domain: DomainKey, selectionId: string) => void;
  loading: boolean;
  providerError: string | null;
}

const ProviderSettingsContext = createContext<ProviderSettingsContextValue | undefined>(undefined);

export function ProviderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_SETTINGS);
  const [availableProviders, setAvailableProviders] = useState<ProviderDescriptor[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const data = await fetchApi('/api/providers');
        setAvailableProviders(data.providers ?? []);
        setProviderError(null);
      } catch (error) {
        console.error('Failed to fetch providers', error);
        setAvailableProviders([]);
        const message = error instanceof Error ? error.message : 'Unable to load providers.';
        setProviderError(message);
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

  const getDescriptor = useCallback(
    (providerId: LLMProvider) => availableProviders.find((p) => p.id === providerId),
    [availableProviders]
  );

  const resolveDefaultModel = useCallback((providerId: LLMProvider): string => {
    const fallback = normalizeModelIdentifier(providerId, FALLBACK_MODELS[providerId]) ?? FALLBACK_MODELS[providerId];
    const descriptor = getDescriptor(providerId);
    const descriptorDefault = descriptor?.defaultModel
      ? normalizeModelIdentifier(providerId, descriptor.defaultModel)
      : undefined;
    const firstModel = descriptor?.models?.[0]?.id
      ? normalizeModelIdentifier(providerId, descriptor.models[0].id)
      : undefined;

    return descriptorDefault ?? firstModel ?? fallback;
  }, [getDescriptor]);

  const sanitizeSelectionModel = useCallback((providerId: LLMProvider, model: string | undefined): string => {
    const fallback = resolveDefaultModel(providerId);
    const descriptor = getDescriptor(providerId);
    const normalized = normalizeModelIdentifier(providerId, model);

    if (!normalized) {
      return fallback;
    }

    if (providerId === 'openrouter') {
      return normalized;
    }

    const models = descriptor?.models;
    if (!models || models.length === 0) {
      return normalized;
    }

    return models.some((entry) => entry.id === normalized) ? normalized : fallback;
  }, [getDescriptor, resolveDefaultModel]);

  const updateProvider = useCallback(
    (domain: DomainKey, providerId: LLMProvider) => {
      setSettings((prev) => {
        return {
          ...prev,
          [domain]: { provider: providerId, model: resolveDefaultModel(providerId) },
        };
      });
    },
    [resolveDefaultModel]
  );

  const updateModel = useCallback((domain: DomainKey, model: string) => {
    setSettings((prev) => ({
      ...prev,
      [domain]: {
        provider: prev[domain].provider,
        model,
      },
    }));
  }, []);

  const addQuickSelection = useCallback(() => {
    setSettings((prev) => {
      const fallbackProviderId: LLMProvider = availableProviders[0]?.id ?? 'openai';
      const model = resolveDefaultModel(fallbackProviderId);

      const newSelection: QuickSelection = {
        id: `qs-${Date.now()}`,
        label: 'New Quick Selection',
        provider: fallbackProviderId,
        model,
      };

      return {
        ...prev,
        quickSelections: [...prev.quickSelections, newSelection],
      };
    });
  }, [availableProviders, resolveDefaultModel]);

  const updateQuickSelection = useCallback((id: string, updates: Partial<QuickSelection>) => {
    setSettings((prev) => {
      const nextSelections = prev.quickSelections.map((selection) => {
        if (selection.id !== id) {
          return selection;
        }

        let provider = selection.provider;
        let model = selection.model;

        if (updates.provider && isValidProviderId(updates.provider)) {
          provider = updates.provider;
          model = resolveDefaultModel(provider);
        }

        if (typeof updates.model === 'string') {
          const trimmed = updates.model.trim();
          model = trimmed || selection.model;
        }

        const label = updates.label !== undefined
          ? (updates.label === '' ? undefined : updates.label)
          : selection.label;

        return {
          ...selection,
          ...updates,
          id: selection.id,
          label,
          provider,
          model,
        } satisfies QuickSelection;
      });

      return {
        ...prev,
        quickSelections: nextSelections,
      };
    });
  }, [resolveDefaultModel]);

  const removeQuickSelection = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      quickSelections: prev.quickSelections.filter((selection) => selection.id !== id),
    }));
  }, []);

  const applyQuickSelection = useCallback((domain: DomainKey, selectionId: string) => {
    setSettings((prev) => {
      const selection = prev.quickSelections.find((item) => item.id === selectionId);
      if (!selection) {
        return prev;
      }

      const providerDescriptor = getDescriptor(selection.provider);
      const providerId = providerDescriptor ? selection.provider : (availableProviders[0]?.id ?? prev[domain].provider);
      const model = sanitizeSelectionModel(providerId, providerDescriptor ? selection.model : undefined);

      if (prev[domain].provider === providerId && prev[domain].model === model) {
        return prev;
      }

      return {
        ...prev,
        [domain]: {
          provider: providerId,
          model,
        },
      };
    });
  }, [availableProviders, getDescriptor, sanitizeSelectionModel]);

  const resetSettings = useCallback(() => {
    setSettings(buildDefaultSettings(availableProviders));
  }, [availableProviders]);

  const value = useMemo<ProviderSettingsContextValue>(
    () => ({
      settings,
      availableProviders,
      quickSelections: settings.quickSelections,
      updateProvider,
      updateModel,
      resetSettings,
      addQuickSelection,
      updateQuickSelection,
      removeQuickSelection,
      applyQuickSelection,
      loading,
      providerError,
    }),
    [
      settings,
      availableProviders,
      updateProvider,
      updateModel,
      resetSettings,
      addQuickSelection,
      updateQuickSelection,
      removeQuickSelection,
      applyQuickSelection,
      loading,
      providerError,
    ]
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
