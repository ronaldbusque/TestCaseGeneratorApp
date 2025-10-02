import { ClipboardDocumentIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';

interface PromptSuggestion {
  id: string;
  category: string;
  prompt: string;
  source: 'default' | 'custom';
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: 'default-ecommerce',
    category: 'E-commerce',
    prompt: 'Generate product descriptions that include material, color, and a short selling point.',
    source: 'default',
  },
  {
    id: 'default-finance',
    category: 'Finance',
    prompt: 'Ensure all currency values are realistic and provide matching transaction descriptions.',
    source: 'default',
  },
  {
    id: 'default-healthcare',
    category: 'Healthcare',
    prompt: 'Create patient notes that include symptoms, diagnosis, and recommended follow-up actions.',
    source: 'default',
  },
  {
    id: 'default-gaming',
    category: 'Gaming',
    prompt: 'Produce character bios with class, skill specializations, and a one-line backstory.',
    source: 'default',
  },
  {
    id: 'default-support',
    category: 'Customer Support',
    prompt: 'Generate realistic support tickets with severity, concise issue description, and next steps.',
    source: 'default',
  },
];

const STORAGE_KEY = 'generator_custom_prompts';

interface AIPromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  currentPrompt: string;
  disabled?: boolean;
  aiFieldNames: string[];
  sampleRow: Record<string, unknown> | null;
  isSampleLoading: boolean;
  onGenerateSample: () => void;
}

export function AIPromptSuggestions({
  onSelect,
  currentPrompt,
  disabled,
  aiFieldNames,
  sampleRow,
  isSampleLoading,
  onGenerateSample,
}: AIPromptSuggestionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customPrompts, setCustomPrompts] = useState<PromptSuggestion[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const prompts = parsed
          .filter((entry): entry is { id: string; category: string; prompt: string } =>
            entry && typeof entry.id === 'string' && typeof entry.category === 'string' && typeof entry.prompt === 'string'
          )
          .map((entry) => ({ ...entry, source: 'custom' as const }));
        setCustomPrompts(prompts);
      }
    } catch (error) {
      console.warn('[AIPromptSuggestions] Failed to restore custom prompts', error);
    }
  }, []);

  const persistCustomPrompts = (prompts: PromptSuggestion[]) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(prompts.map(({ id, category, prompt }) => ({ id, category, prompt })))
    );
  };

  const allPrompts = useMemo(() => [...PROMPT_SUGGESTIONS, ...customPrompts], [customPrompts]);

  const categories = useMemo(() => {
    const unique = new Set<string>(['All']);
    allPrompts.forEach((prompt) => unique.add(prompt.category));
    return Array.from(unique).sort();
  }, [allPrompts]);

  const filteredPrompts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allPrompts.filter((prompt) => {
      const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!term) return true;
      return prompt.prompt.toLowerCase().includes(term) || prompt.category.toLowerCase().includes(term);
    });
  }, [allPrompts, searchTerm, selectedCategory]);

  const handleAddCustomPrompt = () => {
    const trimmed = newPrompt.trim();
    if (!trimmed) return;
    const prompt: PromptSuggestion = {
      id: `custom-${Date.now()}`,
      category: newCategory.trim() || 'Custom',
      prompt: trimmed,
      source: 'custom',
    };
    const next = [prompt, ...customPrompts];
    setCustomPrompts(next);
    persistCustomPrompts(next);
    setNewPrompt('');
  };

  const handleRemoveCustomPrompt = (id: string) => {
    const next = customPrompts.filter((prompt) => prompt.id !== id);
    setCustomPrompts(next);
    persistCustomPrompts(next);
  };

  const handleCopy = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 1200);
    } catch (error) {
      console.warn('[AIPromptSuggestions] Failed to copy prompt', error);
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(null), 1200);
    }
  };

  return (
    <div
      className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700 p-4 space-y-3"
      aria-busy={isSampleLoading}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-violet-300" />
          <h3 className="text-sm font-semibold text-white">Prompt Ideas</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-2 py-1 text-xs"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search..."
            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-2 py-1 text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filteredPrompts.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">No prompts match your filters.</div>
        ) : (
          filteredPrompts.map((suggestion) => {
            const isActive = currentPrompt.trim() === suggestion.prompt;
            const isCustom = suggestion.source === 'custom';
            return (
              <div
                key={suggestion.id}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'border-violet-400 bg-violet-600/40 text-white'
                    : disabled
                    ? 'border-slate-700 bg-slate-800 text-slate-500'
                    : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-violet-400 hover:bg-violet-600/10'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-violet-200/80">{suggestion.category}</p>
                    <p className="text-sm whitespace-pre-line">{suggestion.prompt}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label="Copy prompt"
                      onClick={() => handleCopy(suggestion.prompt)}
                      className="p-1 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        aria-label="Remove custom prompt"
                        onClick={() => handleRemoveCustomPrompt(suggestion.id)}
                        className="p-1 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Use prompt"
                      onClick={() => onSelect(suggestion.prompt)}
                      disabled={disabled}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                        disabled
                          ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                          : 'border-violet-400 text-violet-200 hover:bg-violet-600/20'
                      }`}
                    >
                      Use
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!disabled && (
        <div className="border border-slate-700 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-300 uppercase tracking-wide">Add custom prompt</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newPrompt}
              onChange={(event) => setNewPrompt(event.target.value)}
              placeholder="Describe how AI should enhance your dataset"
              className="flex-1 min-w-[220px] bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
            />
            <input
              type="text"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Category"
              className="w-32 bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleAddCustomPrompt}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-600/30 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      )}

      {copyStatus && (
        <div role="status" aria-live="polite" className="text-xs text-slate-300">
          {copyStatus}
        </div>
      )}

      <div className="border border-slate-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-300 uppercase tracking-wide">AI Sample Preview</p>
          <button
            type="button"
            onClick={onGenerateSample}
            disabled={disabled || aiFieldNames.length === 0 || isSampleLoading}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              disabled || aiFieldNames.length === 0
                ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                : 'border-violet-400 text-violet-200 hover:bg-violet-600/20'
            }`}
          >
            Preview
          </button>
        </div>
        {aiFieldNames.length === 0 ? (
          <p className="text-xs text-slate-500" role="status" aria-live="polite">
            Add at least one AI-Generated field to preview AI output.
          </p>
        ) : isSampleLoading ? (
          <p className="text-xs text-slate-400" role="status" aria-live="polite">
            Generating preview…
          </p>
        ) : sampleRow ? (
          <div className="text-xs text-slate-200 space-y-1">
            <p className="text-slate-400">Sample row:</p>
            <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="AI sample preview values">
                <caption className="sr-only">Preview of AI-enhanced field values</caption>
                <tbody>
                  {Object.entries(sampleRow).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-800 last:border-0">
                      <th className="py-1 pr-3 font-medium text-slate-300 align-top">{key}</th>
                      <td className="py-1 text-slate-200 align-top whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Generate a preview to see how AI will enhance your fields.</p>
        )}
      </div>
    </div>
  );
}
