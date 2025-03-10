import { useState } from 'react';
import { LightBulbIcon } from '@heroicons/react/24/outline';

interface AIEnhancementPanelProps {
  onEnhance: (prompt: string) => void;
  isProcessing: boolean;
}

export function AIEnhancementPanel({ onEnhance, isProcessing }: AIEnhancementPanelProps) {
  const [enhancementPrompt, setEnhancementPrompt] = useState('');
  
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-400" />
        AI Data Enhancement
      </h2>
      
      <p className="text-gray-300 mb-4">
        Describe how you want to enhance or customize your test data beyond the standard generation.
        The AI will apply your rules to make the data more realistic or domain-specific.
      </p>
      
      <textarea
        value={enhancementPrompt}
        onChange={(e) => setEnhancementPrompt(e.target.value)}
        placeholder="Examples: 'Make customer names sound more like sci-fi characters', 'Ensure all generated dates fall within fiscal year 2023', 'Create correlated data between income and education fields'"
        className="w-full h-24 mb-4 bg-slate-900/60 border border-white/10 text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <button
        onClick={() => onEnhance(enhancementPrompt)}
        disabled={isProcessing || !enhancementPrompt.trim()}
        className={`${
          isProcessing || !enhancementPrompt.trim()
            ? 'bg-purple-600/50 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700'
        } text-white px-4 py-2 rounded-xl flex items-center transition-colors`}
      >
        {isProcessing ? 'Processing...' : 'Apply AI Enhancement'}
      </button>
    </div>
  );
} 