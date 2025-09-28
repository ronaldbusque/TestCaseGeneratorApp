import { createGateway } from '@ai-sdk/gateway';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV1 } from 'ai';
import { LLMProvider } from '@/lib/types';

interface ResolveModelOptions {
  provider?: LLMProvider;
  model?: string;
  gatewayModel?: string;
}

const gatewayUrl = process.env.AI_GATEWAY_URL;
const gatewayApiKey = process.env.AI_GATEWAY_API_KEY;

const gatewayClient = gatewayUrl && gatewayApiKey
  ? createGateway({
      url: gatewayUrl,
      apiKey: gatewayApiKey,
    })
  : null;

const openaiClient = process.env.OPENAI_API_KEY
  ? createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

const geminiClient = process.env.GEMINI_API_KEY
  ? createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null;

const openRouterClient = process.env.OPENROUTER_API_KEY
  ? createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER ?? 'https://qualityforge.ai',
        'X-Title': process.env.OPENROUTER_HTTP_TITLE ?? 'QualityForge AI Tools',
      },
    })
  : null;

function inferDefaultModel(provider: LLMProvider | undefined, explicit?: string): string {
  if (explicit) {
    return explicit;
  }

  switch (provider) {
    case 'gemini':
      return process.env.GEMINI_MODEL ?? 'models/gemini-1.5-pro-latest';
    case 'openrouter':
      return process.env.OPENROUTER_MODEL ?? 'openrouter/auto';
    case 'openai':
    default:
      return process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  }
}

function buildGatewayModelId(options: ResolveModelOptions): string | null {
  if (!options.provider) {
    return null;
  }

  if (options.gatewayModel) {
    return options.gatewayModel;
  }

  const targetModel = inferDefaultModel(options.provider, options.model);
  return `${options.provider}/${targetModel}`;
}

export function resolveLanguageModel(options: ResolveModelOptions): LanguageModelV1 {
  const provider = options.provider ?? 'openai';
  const desiredModel = inferDefaultModel(provider, options.model);

  if (gatewayClient) {
    const modelId = buildGatewayModelId({ ...options, provider });
    if (!modelId) {
      throw new Error('Failed to resolve gateway model identifier');
    }

    return gatewayClient(modelId);
  }

  switch (provider) {
    case 'gemini': {
      if (!geminiClient) {
        throw new Error('GEMINI_API_KEY is not configured');
      }
      const normalized = desiredModel.startsWith('models/')
        ? desiredModel
        : `models/${desiredModel}`;
      return geminiClient(normalized);
    }
    case 'openrouter': {
      if (!openRouterClient) {
        throw new Error('OPENROUTER_API_KEY is not configured');
      }
      return openRouterClient(desiredModel);
    }
    case 'openai':
    default: {
      if (!openaiClient) {
        throw new Error('OPENAI_API_KEY is not configured');
      }
      return openaiClient(desiredModel);
    }
  }
}

export function canResolveModel(provider: LLMProvider | undefined): boolean {
  if (gatewayClient) {
    return true;
  }

  switch (provider) {
    case 'gemini':
      return Boolean(geminiClient);
    case 'openrouter':
      return Boolean(openRouterClient);
    case 'openai':
    default:
      return Boolean(openaiClient);
  }
}
