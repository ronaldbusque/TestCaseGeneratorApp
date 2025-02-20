import { AIModelConfig } from './types';

export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'GPT-4-Turbo',
    name: 'GPT-4 Turbo',
    description: 'Latest GPT-4 model with improved performance',
    isAvailable: false
  },
  {
    id: 'GPT-4-Stable',
    name: 'GPT-4 Stable',
    description: 'Stable version of GPT-4',
    isAvailable: false
  },
  {
    id: 'O1-Mini',
    name: 'O1-Mini',
    description: 'Lightweight and efficient model',
    isAvailable: true
  }
]; 