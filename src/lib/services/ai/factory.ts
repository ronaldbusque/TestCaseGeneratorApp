import { AIModel } from '@/lib/types';
import { O1MiniService } from './o1mini';
import { GeminiService } from './gemini';

export function createAIService(model: AIModel) {
  switch (model) {
    case 'Gemini-2.0-Flash-Thinking-Exp-01-21':
      return new GeminiService();
    case 'O1-Mini':
      return new O1MiniService();
    case 'GPT-4-Turbo':
    case 'GPT-4-Stable':
      return new O1MiniService(); // Fallback to O1Mini for now
    default:
      return new O1MiniService();
  }
} 