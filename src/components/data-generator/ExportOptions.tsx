import { EyeIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import type { ExportConfig } from '@/lib/data-generator/types';

interface ExportOptionsProps {
  config: ExportConfig;
  onConfigChange: (config: ExportConfig) => void;
  onExport: () => void;
  onPreview: () => void;
  hasAIGeneratedFields: boolean;
}

export function ExportOptions({ config, onConfigChange, onExport, onPreview, hasAIGeneratedFields }: ExportOptionsProps) {
  const handleRowCountChange = (value: string) => {
    const count = parseInt(value);
    if (!isNaN(count) && count > 0) {
      onConfigChange({
        ...config,
        rowCount: count
      });
    }
  };
  
  const handleFormatChange = (format: ExportConfig['format']) => {
    onConfigChange({
      ...config,
      format
    });
  };
  
  const handleLineEndingChange = (lineEnding: ExportConfig['lineEnding']) => {
    onConfigChange({
      ...config,
      lineEnding
    });
  };
  
  const handleToggleHeader = () => {
    onConfigChange({
      ...config,
      includeHeader: !config.includeHeader
    });
  };
  
  const handleToggleBOM = () => {
    onConfigChange({
      ...config,
      includeBOM: !config.includeBOM
    });
  };
  
  const handleToggleAIEnhancement = () => {
    onConfigChange({
      ...config,
      applyAIEnhancement: !config.applyAIEnhancement
    });
  };

  const handleEnhancementPromptChange = (prompt: string) => {
    onConfigChange({
      ...config,
      enhancementPrompt: prompt,
      applyAIEnhancement: prompt.trim().length > 0
    });
  };

  const handleToggleSeed = () => {
    onConfigChange({
      ...config,
      useDeterministicSeed: !config.useDeterministicSeed,
    });
  };

  const handleSeedValueChange = (value: string) => {
    onConfigChange({
      ...config,
      seedValue: value,
    });
  };
  
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700 p-4 mt-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center">
          <label className="block text-white text-sm font-medium mr-2"># Rows:</label>
          <input
            type="number"
            value={config.rowCount}
            onChange={(e) => handleRowCountChange(e.target.value)}
            className="w-24 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1"
            min="1"
            max="10000"
          />
        </div>
        
        <div className="flex items-center">
          <label className="block text-white text-sm font-medium mr-2">Format:</label>
          <div className="relative">
            <select
              value={config.format}
              onChange={(e) => handleFormatChange(e.target.value as ExportConfig['format'])}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1 pr-8 appearance-none"
            >
              <option value="CSV">CSV</option>
              <option value="JSON">JSON</option>
              <option value="SQL">SQL</option>
              <option value="Excel">Excel</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <label className="block text-white text-sm font-medium mr-2">Line Ending:</label>
          <div className="relative">
            <select
              value={config.lineEnding}
              onChange={(e) => handleLineEndingChange(e.target.value as ExportConfig['lineEnding'])}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1 pr-8 appearance-none"
            >
              <option value="Unix (LF)">Unix (LF)</option>
              <option value="Windows (CRLF)">Windows (CRLF)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={config.includeHeader}
              onChange={handleToggleHeader}
              className="form-checkbox h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded"
            />
            <span className="ml-2 text-white text-sm font-medium">header</span>
          </label>
        </div>
        
        <div className="flex items-center">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={config.includeBOM}
              onChange={handleToggleBOM}
              className="form-checkbox h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded"
            />
            <span className="ml-2 text-white text-sm font-medium">BOM</span>
          </label>
        </div>
        
        <div className="ml-auto flex gap-3">
          <button
            onClick={onPreview}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <EyeIcon className="h-5 w-5 mr-2" />
            Preview
          </button>
          <button
            onClick={onExport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Generate Data
          </button>
        </div>
      </div>
      
      {/* AI Context Section - Only show if there are AI-Generated fields */}
      {hasAIGeneratedFields && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <div className="flex items-center mb-2">
            <span className="text-white text-sm font-medium flex items-center">
              <LightBulbIcon className="h-4 w-4 mr-1 text-yellow-400" />
              AI Context for Generated Fields
            </span>
          </div>
          
          <div className="mt-2">
            <p className="text-slate-300 text-xs mb-2">
              Provide context and instructions for AI-Generated fields. This helps the AI understand how to generate values for fields with the &quot;AI-Generated&quot; type.
            </p>
            <textarea
              value={config.enhancementPrompt}
              onChange={(e) => handleEnhancementPromptChange(e.target.value)}
              placeholder={'Examples: &quot;Generate sci-fi character names&quot;, &quot;Create realistic product descriptions for a tech company&quot;, &quot;Generate addresses in the Boston area&quot;'}
              className="w-full h-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-slate-700 pt-4">
        <div className="flex items-center mb-2 justify-between">
          <span className="text-white text-sm font-medium">Deterministic Seed</span>
          <label className="inline-flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={config.useDeterministicSeed}
              onChange={handleToggleSeed}
              className="form-checkbox h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded"
            />
            Lock Random Seed
          </label>
        </div>
        {config.useDeterministicSeed && (
          <div className="mt-2">
            <input
              type="text"
              value={config.seedValue}
              onChange={(e) => handleSeedValueChange(e.target.value)}
              placeholder="e.g. ecommerce-demo"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              Using the same seed reproduces identical datasets. Leave empty or disable the toggle for randomised output.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
