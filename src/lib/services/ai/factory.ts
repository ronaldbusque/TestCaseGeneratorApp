import { LLMProvider } from '@/lib/types';
import { AgentsService } from './agents';
import { GeminiService } from './gemini';
import { OpenRouterService } from './openrouter';

export function createAIService(provider: LLMProvider = 'openai') {
  switch (provider) {
    case 'gemini':
      return new GeminiService();
    case 'openrouter':
      return new OpenRouterService();
    case 'openai':
    default:
      return new AgentsService();
  }
}
