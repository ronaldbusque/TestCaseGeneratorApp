import { LLMProvider } from '@/lib/types';
import { VercelAIService } from './vercelService';

export function createAIService(provider: LLMProvider = 'openai') {
  return new VercelAIService(provider);
}
