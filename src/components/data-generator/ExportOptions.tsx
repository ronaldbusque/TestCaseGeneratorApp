import { useState, useEffect } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

interface ExportConfig {
  rowCount: number;
  format: 'CSV' | 'JSON' | 'SQL' | 'Excel';
  lineEnding: 'Unix (LF)' | 'Windows (CRLF)';
  includeHeader: boolean;
  includeBOM: boolean;
}

interface ExportOptionsProps {
  config: ExportConfig;
  onConfigChange: (config: ExportConfig) => void;
  onExport: () => void;
  onPreview: () => void;
}

export function ExportOptions({ config, onConfigChange, onExport, onPreview }: ExportOptionsProps) {
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
    </div>
  );
} 