export type LLMProvider = 'openai' | 'gemini' | 'openrouter';

export type ProviderSettings = {
  testCases: LLMProvider;
  sql: LLMProvider;
  data: LLMProvider;
};

export interface ProviderDescriptor {
  id: LLMProvider;
  label: string;
  description?: string;
  supportsMultimodal?: boolean;
}
