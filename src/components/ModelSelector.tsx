'use client';

import { useState } from 'react';
import { AIModel } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  onModelSelect: (model: AIModel) => void;
}

export function ModelSelector({ onModelSelect }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel>('O1-Mini');

  const modelOptions = [
    { id: 'GPT-4-Turbo', name: 'GPT-4 Turbo', isAvailable: true },
    { id: 'GPT-4-Stable', name: 'GPT-4 Stable', isAvailable: true },
    { id: 'O1-Mini', name: 'O1 Mini', isAvailable: true },
    { 
      id: 'Gemini-2.0-Flash-Thinking-Exp-01-21', 
      name: 'Google Gemini', 
      isAvailable: true 
    },
  ] as const;

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
    onModelSelect(model);
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold">Select Model</h2>
      <div className="flex flex-wrap gap-2">
        {modelOptions.map((model) => (
          <button
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            disabled={!model.isAvailable}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              {
                'bg-blue-600 text-white': selectedModel === model.id && model.isAvailable,
                'bg-gray-100 text-gray-900': selectedModel !== model.id && model.isAvailable,
                'cursor-not-allowed bg-gray-100 text-gray-400': !model.isAvailable,
              }
            )}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
} 