'use client';

import { AIModel } from '@/lib/types';

const models = [
  {
    id: 'O1-Mini' as AIModel,
    name: 'O1 Mini',
    description: 'Fast and efficient test case generation',
    isAvailable: true,
  },
  {
    id: 'Gemini' as AIModel,
    name: 'Google Gemini',
    description: 'Advanced test case generation with Google AI',
    isAvailable: true,
  },
];

export const ModelSelector = ({ onModelSelect }: { onModelSelect: (model: AIModel) => void }) => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Select Model</h2>
      <div className="flex flex-wrap gap-3">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelSelect(model.id)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              model.isAvailable
                ? 'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
}; 