'use client';

import { AIModel } from '@/lib/types';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const models = [
  {
    id: 'Gemini' as AIModel,
    name: 'Google Gemini',
    description: 'Advanced test case generation with Google AI',
    isAvailable: true,
  },
  {
    id: 'O1-Mini' as AIModel,
    name: 'OpenAI O1-Mini',
    description: 'Fast and efficient test case generation',
    isAvailable: true,
  },
];

interface ModelSelectorProps {
  onModelSelect: (model: AIModel) => void;
  selectedModel?: AIModel;
}

export const ModelSelector = ({ onModelSelect, selectedModel = 'Gemini' }: ModelSelectorProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Select Model</h2>
      <div className="flex flex-wrap gap-3">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelSelect(model.id)}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors',
              model.isAvailable
                ? 'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'opacity-50 cursor-not-allowed',
              selectedModel === model.id && 'bg-blue-100 text-blue-700 font-medium'
            )}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
}; 