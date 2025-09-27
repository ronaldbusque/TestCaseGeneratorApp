import { FALLBACK_MODELS } from '@/lib/providerSettings';
import {
  LLMProvider,
  ProviderModelInfo,
  ProviderStatusSummary,
  ProviderStatusSeverity,
} from '@/lib/types/providers';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const MODEL_CACHE_TTL = 5 * 60 * 1000; // five minutes
const STATUS_CACHE_TTL = 2 * 60 * 1000; // two minutes keeps UI fresh without spamming APIs

const modelCache = new Map<LLMProvider, CacheEntry<ProviderModelInfo[]>>();
const statusCache = new Map<LLMProvider, CacheEntry<ProviderStatusSummary | null>>();

const STATIC_MODEL_CATALOG: Record<LLMProvider, ProviderModelInfo[]> = {
  openai: FALLBACK_MODELS.openai
    ? [
        { id: 'gpt-4.1' },
        { id: 'gpt-4.1-mini' },
        { id: 'gpt-4.1-nano' },
        { id: 'gpt-4o' },
        { id: 'gpt-4o-mini' },
        { id: 'o3-mini' },
      ]
    : [],
  gemini: [
    { id: 'gemini-2.0-flash-exp' },
    { id: 'gemini-2.0-pro-exp' },
    { id: 'gemini-1.5-pro-latest' },
    { id: 'gemini-1.5-flash-latest' },
    { id: 'gemini-2.5-flash-latest' },
  ],
  openrouter: [
    { id: 'openrouter/auto' },
    { id: 'openai/gpt-4o-mini' },
    { id: 'anthropic/claude-3.5-sonnet:beta' },
    { id: 'x-ai/grok-4-fast:free' },
    { id: 'meta-llama/llama-3.1-70b-instruct' },
  ],
};

const HIDDEN_MODEL_PATTERNS = [
  /^text-embedding/i,
  /^text-moderation/i,
  /^audio-/i,
  /whisper/i,
  /vision/i,
  /realtime/i,
];

function isModelVisible(id: string): boolean {
  return !HIDDEN_MODEL_PATTERNS.some((pattern) => pattern.test(id));
}

function formatLabel(id: string): string {
  return id
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/gi, (letter) => letter.toUpperCase());
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenAIModels(): Promise<ProviderModelInfo[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return STATIC_MODEL_CATALOG.openai;
  }

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI models request failed: ${response.status}`);
    }

    const payload: any = await response.json();
    const models: ProviderModelInfo[] = (payload?.data ?? [])
      .map((raw: any) => raw?.id as string | undefined)
      .filter((id: string | undefined): id is string => typeof id === 'string' && isModelVisible(id))
      .map((id: string) => ({ id, label: formatLabel(id) }))
      .sort((a: ProviderModelInfo, b: ProviderModelInfo) => a.id.localeCompare(b.id));

    return models.length ? models : STATIC_MODEL_CATALOG.openai;
  } catch (error) {
    console.warn('[providerModels] Falling back to static OpenAI catalog', error);
    return STATIC_MODEL_CATALOG.openai;
  }
}

async function fetchGeminiModels(): Promise<ProviderModelInfo[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return STATIC_MODEL_CATALOG.gemini;
  }

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}&pageSize=200`
    );

    if (!response.ok) {
      throw new Error(`Gemini models request failed: ${response.status}`);
    }

    const payload: any = await response.json();
    const models: ProviderModelInfo[] = (payload?.models ?? [])
      .map((raw: any) => raw?.name as string | undefined)
      .filter((id: string | undefined): id is string => typeof id === 'string')
      .map((id: string) => ({ id, label: formatLabel(id) }))
      .sort((a: ProviderModelInfo, b: ProviderModelInfo) => a.id.localeCompare(b.id));

    return models.length ? models : STATIC_MODEL_CATALOG.gemini;
  } catch (error) {
    console.warn('[providerModels] Falling back to static Gemini catalog', error);
    return STATIC_MODEL_CATALOG.gemini;
  }
}

async function fetchOpenRouterModels(): Promise<ProviderModelInfo[]> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_COMPAT_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? process.env.OPENAI_COMPAT_API_BASE_URL ?? 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    return STATIC_MODEL_CATALOG.openrouter;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter models request failed: ${response.status}`);
    }

    const payload: any = await response.json();
    const models: ProviderModelInfo[] = (payload?.data ?? [])
      .map((raw: any) => raw?.id as string | undefined)
      .filter((id: string | undefined): id is string => typeof id === 'string')
      .map((id: string) => ({ id, label: formatLabel(id) }))
      .sort((a: ProviderModelInfo, b: ProviderModelInfo) => a.id.localeCompare(b.id));

    return models.length ? models : STATIC_MODEL_CATALOG.openrouter;
  } catch (error) {
    console.warn('[providerModels] Falling back to static OpenRouter catalog', error);
    return STATIC_MODEL_CATALOG.openrouter;
  }
}

const MODEL_FETCHERS: Record<LLMProvider, () => Promise<ProviderModelInfo[]>> = {
  openai: fetchOpenAIModels,
  gemini: fetchGeminiModels,
  openrouter: fetchOpenRouterModels,
};

async function fetchOpenAIStatus(): Promise<ProviderStatusSummary | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetchWithTimeout('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }, 7000);

    if (!response.ok) {
      throw new Error(`OpenAI credit request failed: ${response.status}`);
    }

    const payload: any = await response.json();
    const remaining = typeof payload?.total_available === 'number' ? payload.total_available : undefined;
    const grantExpirySeconds = payload?.grant?.[0]?.expires_at as number | undefined;
    const refreshAt = grantExpirySeconds ? new Date(grantExpirySeconds * 1000).toISOString() : undefined;

    const severity: ProviderStatusSeverity = remaining && remaining > 0 ? 'ok' : 'warning';
    const headline = remaining !== undefined
      ? `Remaining credit $${remaining.toFixed(2)}`
      : 'Usage details unavailable';

    return {
      severity,
      headline,
      detail: refreshAt ? `Renews ${new Date(refreshAt).toLocaleDateString()}` : undefined,
      remainingCreditsUsd: remaining,
      refreshAt,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  } catch (error: any) {
    console.warn('[providerModels] Unable to load OpenAI credit status', error);
    return {
      severity: 'error',
      headline: 'Unable to fetch OpenAI usage',
      detail: 'Recent spend could not be retrieved from the API.',
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function fetchGeminiStatus(): Promise<ProviderStatusSummary | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return {
    severity: 'ok',
    headline: 'Usage metrics unavailable',
    detail: 'Google does not expose credit data via the public Gemini API.',
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

async function fetchOpenRouterStatus(): Promise<ProviderStatusSummary | null> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_COMPAT_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL ?? process.env.OPENAI_COMPAT_API_BASE_URL ?? 'https://openrouter.ai/api/v1';
  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/auth/key`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }, 6000);

    if (!response.ok) {
      throw new Error(`OpenRouter auth request failed: ${response.status}`);
    }

    const payload: any = await response.json();
    const remaining = payload?.data?.rate_limit?.remaining as number | undefined;
    const limit = payload?.data?.rate_limit?.limit as number | undefined;
    const resetSeconds = payload?.data?.rate_limit?.reset as number | undefined;
    const refreshAt = resetSeconds ? new Date(resetSeconds * 1000).toISOString() : undefined;

    let severity: ProviderStatusSeverity = 'ok';
    if (typeof remaining === 'number' && typeof limit === 'number' && remaining <= Math.max(Math.floor(limit * 0.1), 50)) {
      severity = 'warning';
    }

    const headline = typeof remaining === 'number' && typeof limit === 'number'
      ? `${remaining}/${limit} requests left`
      : 'Usage status available';

    return {
      severity,
      headline,
      detail: refreshAt ? `Resets ${new Date(refreshAt).toLocaleTimeString()}` : undefined,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };
  } catch (error: any) {
    console.warn('[providerModels] Unable to load OpenRouter usage', error);
    return {
      severity: 'error',
      headline: 'Unable to fetch OpenRouter usage',
      detail: 'Rate-limit details were not provided by the API.',
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

const STATUS_FETCHERS: Record<LLMProvider, () => Promise<ProviderStatusSummary | null>> = {
  openai: fetchOpenAIStatus,
  gemini: fetchGeminiStatus,
  openrouter: fetchOpenRouterStatus,
};

function getCachedValue<T>(cache: Map<LLMProvider, CacheEntry<T>>, key: LLMProvider): T | undefined {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value;
  }
  return undefined;
}

function setCachedValue<T>(cache: Map<LLMProvider, CacheEntry<T>>, key: LLMProvider, value: T, ttl: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

export async function getProviderModels(provider: LLMProvider): Promise<ProviderModelInfo[]> {
  const cached = getCachedValue(modelCache, provider);
  if (cached) {
    return cached;
  }

  const fetcher = MODEL_FETCHERS[provider];
  const models = fetcher ? await fetcher() : [];
  const finalModels = models.length ? models : STATIC_MODEL_CATALOG[provider] ?? [];
  setCachedValue(modelCache, provider, finalModels, MODEL_CACHE_TTL);
  return finalModels;
}

export async function getAllProviderModels(): Promise<Record<LLMProvider, ProviderModelInfo[]>> {
  const providers: LLMProvider[] = ['openai', 'gemini', 'openrouter'];
  const entries = await Promise.all(providers.map(async (provider) => {
    const models = await getProviderModels(provider);
    return [provider, models] as const;
  }));
  return Object.fromEntries(entries) as Record<LLMProvider, ProviderModelInfo[]>;
}

export async function getProviderStatus(provider: LLMProvider): Promise<ProviderStatusSummary | null> {
  const cached = getCachedValue(statusCache, provider);
  if (cached !== undefined) {
    return cached;
  }

  const fetcher = STATUS_FETCHERS[provider];
  const status = fetcher ? await fetcher() : null;
  setCachedValue(statusCache, provider, status, STATUS_CACHE_TTL);
  return status;
}

export async function getAllProviderStatus(): Promise<Record<LLMProvider, ProviderStatusSummary | null>> {
  const providers: LLMProvider[] = ['openai', 'gemini', 'openrouter'];
  const entries = await Promise.all(providers.map(async (provider) => {
    const status = await getProviderStatus(provider);
    return [provider, status] as const;
  }));
  return Object.fromEntries(entries) as Record<LLMProvider, ProviderStatusSummary | null>;
}
