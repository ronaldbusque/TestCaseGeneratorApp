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

export interface ProviderDescriptor {
  id: LLMProvider;
  label: string;
  description?: string;
  supportsMultimodal?: boolean;
  defaultModel?: string;
  baseUrl?: string;
}
