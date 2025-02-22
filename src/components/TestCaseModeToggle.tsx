'use client';

import { TestCaseMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DocumentTextIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface TestCaseModeToggleProps {
  mode: TestCaseMode;
  onModeChange: (mode: TestCaseMode) => void;
}

export function TestCaseModeToggle({ mode, onModeChange }: TestCaseModeToggleProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Generation Type</h2>
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('high-level')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors flex items-center gap-2',
            'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            mode === 'high-level' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
          )}
        >
          <DocumentMagnifyingGlassIcon className="h-5 w-5" />
          <span>High-level</span>
        </button>
        <button
          onClick={() => onModeChange('detailed')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors flex items-center gap-2',
            'hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            mode === 'detailed' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
          )}
        >
          <DocumentTextIcon className="h-5 w-5" />
          <span>Detailed</span>
        </button>
      </div>
    </div>
  );
} 