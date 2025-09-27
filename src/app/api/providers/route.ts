import { NextResponse } from 'next/server';
import { ProviderDescriptor } from '@/lib/types/providers';

export async function GET() {
  const providers: ProviderDescriptor[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      id: 'openai',
      label: 'OpenAI (Agents SDK)',
      description: 'Uses OpenAI Agents SDK with reasoning models like GPT-4.1 for multimodal workflows.',
      supportsMultimodal: true,
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      id: 'gemini',
      label: 'Google Gemini',
      description: 'Calls Google Gemini for text and multimodal responses using the Gemini SDK.',
      supportsMultimodal: true,
    });
  }

  if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_COMPAT_API_KEY) {
    providers.push({
      id: 'openrouter',
      label: 'OpenRouter (OpenAI-compatible)',
      description: 'Uses an OpenAI-compatible completion endpoint (defaults to OpenRouter). Configure OPENROUTER_API_KEY.',
      supportsMultimodal: false,
    });
  }

  if (!providers.length) {
    providers.push({
      id: 'openai',
      label: 'OpenAI (Agents SDK)',
      description: 'Default fallback when no API keys are provided. Configure OPENAI_API_KEY for full functionality.',
      supportsMultimodal: true,
    });
  }

  return NextResponse.json({ providers });
}
