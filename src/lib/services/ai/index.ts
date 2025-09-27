import { LLMProvider, AIService } from '@/lib/types';
import { createAIService } from './factory';

const instances = new Map<LLMProvider, AIService>();

export function getAIService(provider: LLMProvider = 'openai'): AIService {
  if (!instances.has(provider)) {
    instances.set(provider, createAIService(provider));
  }
  return instances.get(provider)!;
}
