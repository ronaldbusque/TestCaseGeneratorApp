import { AIModel } from '@/lib/types';
import { O3MiniService } from './o3mini';
import { GeminiService } from './gemini';

export function createAIService(model: AIModel) {
  switch (model) {
    case 'Gemini':
      return new GeminiService();
    case 'O3-Mini':
      return new O3MiniService();
    default:
      return new GeminiService(); // Default to Gemini
  }
} 