import {
  LLMProvider,
  ProviderDescriptor,
  ProviderSelection,
  ProviderSettings,
  QuickSelection,
} from '@/lib/types/providers';

export const FALLBACK_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-flash-latest',
  openrouter: 'openrouter/auto',
};

const DEFAULT_QUICK_SELECTIONS: QuickSelection[] = [
  {
    id: 'qs-gemini-flash-latest',
    label: 'Gemini Flash Latest',
    provider: 'gemini',
    model: 'gemini-flash-latest',
  },
  {
    id: 'qs-gemini-25-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    model: 'gemini-2.5-pro',
  },
  {
    id: 'qs-gpt-41-mini',
    label: 'GPT-4.1 Mini',
    provider: 'openai',
    model: 'gpt-4.1-mini',
  },
  {
    id: 'qs-gpt-5-mini',
    label: 'GPT-5 Mini',
    provider: 'openai',
    model: 'gpt-5-thinking-mini',
  },
  {
    id: 'qs-gpt-5',
    label: 'GPT-5',
    provider: 'openai',
    model: 'gpt-5-thinking',
  },
  {
    id: 'qs-grok-4-fast',
    label: 'Grok 4 Fast (OpenRouter)',
    provider: 'openrouter',
    model: 'x-ai/grok-4-fast:free',
  },
];

export const DEFAULT_SETTINGS: ProviderSettings = {
  testCases: { provider: 'openai', model: FALLBACK_MODELS.openai },
  sql: { provider: 'openai', model: FALLBACK_MODELS.openai },
  data: { provider: 'openai', model: FALLBACK_MODELS.openai },
  quickSelections: DEFAULT_QUICK_SELECTIONS.map((selection) => ({ ...selection })),
};

export function coerceStoredSettings(raw: any): ProviderSettings {
  const normalize = (selection: any, domain: 'testCases' | 'sql' | 'data'): ProviderSelection => {
    if (selection && typeof selection === 'object' && 'provider' in selection) {
      const provider = isValidProvider(selection.provider)
        ? (selection.provider as LLMProvider)
        : 'openai';
      const model = typeof selection.model === 'string' && selection.model.trim()
        ? selection.model.trim()
        : FALLBACK_MODELS[provider];
      return { provider, model };
    }

    if (typeof selection === 'string' && isValidProvider(selection)) {
      const provider = selection as LLMProvider;
      return { provider, model: FALLBACK_MODELS[provider] };
    }

    const fallback = DEFAULT_SETTINGS[domain];
    return { provider: fallback.provider, model: fallback.model };
  };

  const normalizeQuickSelections = (rawQuickSelections: any): QuickSelection[] => {
    if (!Array.isArray(rawQuickSelections)) {
      return DEFAULT_SETTINGS.quickSelections.map((selection) => ({ ...selection }));
    }

    const mapped = rawQuickSelections
      .map((entry: any, index: number): QuickSelection | null => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const provider = isValidProvider(entry.provider)
          ? (entry.provider as LLMProvider)
          : 'openai';
        const model = typeof entry.model === 'string' && entry.model.trim()
          ? entry.model.trim()
          : FALLBACK_MODELS[provider];
        const id = typeof entry.id === 'string' && entry.id.trim()
          ? entry.id.trim()
          : `qs-${provider}-${index}`;
        const label = typeof entry.label === 'string' && entry.label.trim()
          ? entry.label.trim()
          : undefined;

        return { id, label, provider, model };
      })
      .filter((entry): entry is QuickSelection => Boolean(entry));

    return mapped.length
      ? mapped
      : DEFAULT_SETTINGS.quickSelections.map((selection) => ({ ...selection }));
  };

  return {
    testCases: normalize(raw?.testCases, 'testCases'),
    sql: normalize(raw?.sql, 'sql'),
    data: normalize(raw?.data, 'data'),
    quickSelections: normalizeQuickSelections(raw?.quickSelections),
  };
}

export function ensureSettingsFallback(
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
    const defaultModel = descriptor.defaultModel
      ?? descriptor.models?.[0]?.id
      ?? FALLBACK_MODELS[providerId];
    const providerChanged = selection.provider !== providerId;
    const normalizedModel = providerChanged
      ? defaultModel
      : (selection.model?.trim() || defaultModel);

    return {
      provider: providerId,
      model: normalizedModel,
    };
  };

  const normalizeQuickSelection = (selection: QuickSelection, index: number): QuickSelection => {
    const providerId = providerMap.has(selection.provider)
      ? selection.provider
      : fallbackProvider.id;
    const descriptor = providerMap.get(providerId) ?? fallbackProvider;
    const defaultModel = descriptor.defaultModel
      ?? descriptor.models?.[0]?.id
      ?? FALLBACK_MODELS[providerId];
    const normalizedModel = selection.model?.trim() || defaultModel;
    const label = selection.label?.trim() || undefined;
    const id = selection.id?.trim() || `qs-${providerId}-${index}`;

    return {
      id,
      label,
      provider: providerId,
      model: normalizedModel,
    };
  };

  const quickSelections = (current.quickSelections && current.quickSelections.length
    ? current.quickSelections
    : DEFAULT_SETTINGS.quickSelections)
    .map((selection, index) => normalizeQuickSelection(selection, index));

  return {
    testCases: normalize(current.testCases),
    sql: normalize(current.sql),
    data: normalize(current.data),
    quickSelections,
  };
}

export function buildDefaultSettings(providers: ProviderDescriptor[]): ProviderSettings {
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
    const model = descriptor.defaultModel
      ?? descriptor.models?.[0]?.id
      ?? FALLBACK_MODELS[providerId];
    return { provider: providerId, model };
  };

  return {
    testCases: createSelection(DEFAULT_SETTINGS.testCases),
    sql: createSelection(DEFAULT_SETTINGS.sql),
    data: createSelection(DEFAULT_SETTINGS.data),
    quickSelections: DEFAULT_SETTINGS.quickSelections.map((selection, index) => {
      const providerId = providerMap.has(selection.provider)
        ? selection.provider
        : fallback.id;
      const descriptor = providerMap.get(providerId) ?? fallback;
      const model = descriptor.defaultModel
        ?? descriptor.models?.[0]?.id
        ?? FALLBACK_MODELS[providerId];

      return {
        id: selection.id || `qs-${providerId}-${index}`,
        label: selection.label,
        provider: providerId,
        model: selection.provider === providerId ? selection.model : model,
      };
    }),
  };
}

function isValidProvider(value: any): value is LLMProvider {
  return value === 'openai' || value === 'gemini' || value === 'openrouter';
}
