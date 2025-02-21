import { AIModel } from '@/lib/types';
import { O1MiniService } from './o1mini';
import { GeminiService } from './gemini';

export function createAIService(model: AIModel) {
  switch (model) {
    case 'Gemini':
      return new GeminiService();
    case 'O1-Mini':
      return new O1MiniService();
    default:
      return new GeminiService(); // Default to Gemini
  }
} 