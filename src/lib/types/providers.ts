export type LLMProvider = 'openai' | 'gemini' | 'openrouter';

export interface ProviderSelection {
  provider: LLMProvider;
  model: string;
}

export type ProviderSettings = {
  testCases: ProviderSelection;
  sql: ProviderSelection;
  data: ProviderSelection;
};

export interface ProviderModelInfo {
  id: string;
  label?: string;
  description?: string;
  contextWindow?: number;
  owned?: boolean;
}

export type ProviderStatusSeverity = 'ok' | 'warning' | 'error';

export interface ProviderStatusSummary {
  severity: ProviderStatusSeverity;
  headline: string;
  detail?: string;
  remainingCreditsUsd?: number;
  refreshAt?: string;
  fetchedAt: string;
  source?: 'live' | 'fallback';
  error?: string;
}

export interface ProviderDescriptor {
  id: LLMProvider;
  label: string;
  description?: string;
  supportsMultimodal?: boolean;
  defaultModel?: string;
  baseUrl?: string;
  models?: ProviderModelInfo[];
  status?: ProviderStatusSummary | null;
}
