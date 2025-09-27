import { ProviderDescriptor } from '@/lib/types/providers';
import { FALLBACK_MODELS } from '@/lib/providerSettings';

export function getAvailableProviders(): ProviderDescriptor[] {
  const providers: ProviderDescriptor[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      id: 'openai',
      label: 'OpenAI (Agents SDK)',
      description: 'Uses OpenAI Agents SDK with reasoning models like GPT-4.1 for multimodal workflows.',
      supportsMultimodal: true,
      defaultModel: process.env.OPENAI_MODEL ?? FALLBACK_MODELS.openai,
      baseUrl: 'https://api.openai.com',
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      id: 'gemini',
      label: 'Google Gemini',
      description: 'Calls Google Gemini for text and multimodal responses using the Gemini SDK.',
      supportsMultimodal: true,
      defaultModel: process.env.GEMINI_MODEL ?? FALLBACK_MODELS.gemini,
      baseUrl: 'https://generativelanguage.googleapis.com',
    });
  }

  if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_COMPAT_API_KEY) {
    providers.push({
      id: 'openrouter',
      label: 'OpenRouter (OpenAI-compatible)',
      description: 'Uses an OpenAI-compatible completion endpoint (defaults to OpenRouter). Configure OPENROUTER_API_KEY.',
      supportsMultimodal: false,
      defaultModel: process.env.OPENROUTER_MODEL ?? process.env.OPENAI_COMPAT_MODEL ?? FALLBACK_MODELS.openrouter,
      baseUrl: (process.env.OPENROUTER_BASE_URL ?? process.env.OPENAI_COMPAT_API_BASE_URL ?? 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    });
  }

  if (!providers.length) {
    providers.push({
      id: 'openai',
      label: 'OpenAI (Agents SDK)',
      description: 'Default fallback when no API keys are provided. Configure OPENAI_API_KEY for full functionality.',
      supportsMultimodal: true,
      defaultModel: FALLBACK_MODELS.openai,
      baseUrl: 'https://api.openai.com',
    });
  }

  return providers;
}
