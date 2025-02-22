import { AIModel, AIService } from '@/lib/types';
import { O1MiniService } from './o1mini';
import { GeminiService } from './gemini';

const services: Record<AIModel, AIService> = {
  'O1-Mini': new O1MiniService(),
  'Gemini': new GeminiService()
};

export function getAIService(model: AIModel): AIService {
  return services[model];
} 