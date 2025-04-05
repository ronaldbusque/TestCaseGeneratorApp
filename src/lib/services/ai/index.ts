import { AIModel, AIService } from '@/lib/types';
import { O3MiniService } from './o3mini';
import { GeminiService } from './gemini';

const services: Record<AIModel, AIService> = {
  'O3-Mini': new O3MiniService(),
  'Gemini': new GeminiService()
};

export function getAIService(model: AIModel): AIService {
  return services[model];
} 