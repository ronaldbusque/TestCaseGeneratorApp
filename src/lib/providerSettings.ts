import {
  LLMProvider,
  ProviderDescriptor,
  ProviderSelection,
  ProviderSettings,
} from '@/lib/types/providers';

export const FALLBACK_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-1.5-pro-latest',
  openrouter: 'openrouter/auto',
};

export const DEFAULT_SETTINGS: ProviderSettings = {
  testCases: { provider: 'openai', model: FALLBACK_MODELS.openai },
  sql: { provider: 'openai', model: FALLBACK_MODELS.openai },
  data: { provider: 'openai', model: FALLBACK_MODELS.openai },
};

export function coerceStoredSettings(raw: any): ProviderSettings {
  const normalize = (selection: any, domain: keyof ProviderSettings): ProviderSelection => {
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

    return DEFAULT_SETTINGS[domain];
  };

  return {
    testCases: normalize(raw?.testCases, 'testCases'),
    sql: normalize(raw?.sql, 'sql'),
    data: normalize(raw?.data, 'data'),
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

  return {
    testCases: normalize(current.testCases),
    sql: normalize(current.sql),
    data: normalize(current.data),
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
  };
}

function isValidProvider(value: any): value is LLMProvider {
  return value === 'openai' || value === 'gemini' || value === 'openrouter';
}
