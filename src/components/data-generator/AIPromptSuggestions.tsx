import { SparklesIcon } from '@heroicons/react/24/outline';

interface PromptSuggestion {
  category: string;
  prompt: string;
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    category: 'E-commerce',
    prompt: 'Generate product descriptions that include material, color, and a short selling point.',
  },
  {
    category: 'Finance',
    prompt: 'Ensure all currency values are realistic and provide matching transaction descriptions.',
  },
  {
    category: 'Healthcare',
    prompt: 'Create patient notes that include symptoms, diagnosis, and recommended follow-up actions.',
  },
  {
    category: 'Gaming',
    prompt: 'Produce character bios with class, skill specializations, and a one-line backstory.',
  },
  {
    category: 'Customer Support',
    prompt: 'Generate realistic support tickets with severity, concise issue description, and next steps.',
  },
];

interface AIPromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  currentPrompt: string;
  disabled?: boolean;
}

export function AIPromptSuggestions({ onSelect, currentPrompt, disabled }: AIPromptSuggestionsProps) {
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-violet-300" />
          <h3 className="text-sm font-semibold text-white">Prompt Ideas</h3>
        </div>
        {disabled && (
          <span className="text-xs text-slate-400">Add AI-generated fields to enable</span>
        )}
      </div>

      <div className="space-y-2">
        {PROMPT_SUGGESTIONS.map((suggestion) => {
          const isActive = currentPrompt.trim() === suggestion.prompt;
          return (
            <button
              key={suggestion.category}
              type="button"
              onClick={() => onSelect(suggestion.prompt)}
              disabled={disabled}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                isActive
                  ? 'border-violet-400 bg-violet-600/40 text-white'
                  : disabled
                  ? 'border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-violet-400 hover:bg-violet-600/10'
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-violet-200/80">{suggestion.category}</p>
              <p className="text-sm">{suggestion.prompt}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
