'use client';

import { AIModel } from '@/lib/types';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const models = [
  {
    id: 'Gemini' as AIModel,
    name: 'Google Gemini',
    description: 'Using gemini-2.0-flash-thinking-exp-01-21',
    isAvailable: true,
    logo: (
      <Image
        src="/gemini-icon.png"
        alt="Google Gemini Logo"
        width={24}
        height={24}
        className="rounded"
      />
    ),
  },
  {
    id: 'O3-Mini' as AIModel,
    name: 'OpenAI o3-mini',
    description: 'Using o3-mini model',
    isAvailable: true,
    logo: (
      <Image
        src="/openai-icon.png"
        alt="OpenAI Logo"
        width={24}
        height={24}
        className="rounded"
      />
    ),
  },
];

interface ModelSelectorProps {
  onModelSelect: (model: AIModel) => void;
  selectedModel?: AIModel;
}

export const ModelSelector = ({ onModelSelect, selectedModel = 'Gemini' }: ModelSelectorProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-blue-100">Select AI Model</h2>
      <div className="p-1 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
        <div className="flex gap-1">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => onModelSelect(model.id)}
              className={cn(
                'relative w-[180px] px-4 py-2.5 rounded-xl transition-all duration-300',
                'focus:outline-none',
                model.isAvailable
                  ? selectedModel === model.id
                    ? [
                        'bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm',
                        'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
                        'border border-white/20',
                        'text-white font-medium',
                      ].join(' ')
                    : [
                        'hover:bg-white/5',
                        'text-blue-200 hover:text-blue-100',
                        'border border-transparent',
                      ].join(' ')
                  : 'opacity-50 cursor-not-allowed'
              )}
              disabled={!model.isAvailable}
              title={model.description}
            >
              <div className="flex items-center justify-center gap-2 w-full">
                {model.logo}
                <span className="whitespace-nowrap">{model.name}</span>
              </div>
              {selectedModel === model.id && (
                <div className="absolute inset-0 rounded-xl bg-blue-400/10 animate-pulse -z-10"></div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 