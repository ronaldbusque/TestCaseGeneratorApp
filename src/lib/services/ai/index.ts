import { AIModel, AIService } from '@/lib/types';
import { O1MiniService } from './o1mini';

const services: Record<AIModel, AIService> = {
  'O1-Mini': new O1MiniService(),
  'GPT-4-Turbo': new O1MiniService(), // Placeholder for future implementation
  'GPT-4-Stable': new O1MiniService(), // Placeholder for future implementation
};

export function getAIService(model: AIModel): AIService {
  return services[model];
} 