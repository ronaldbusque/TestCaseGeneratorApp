'use client';

import { TestCaseMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DocumentTextIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface TestCaseModeToggleProps {
  mode: TestCaseMode;
  onModeChange: (mode: TestCaseMode) => void;
  className?: string;
}

export function TestCaseModeToggle({
  mode,
  onModeChange,
  className
}: TestCaseModeToggleProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h2 className="text-lg font-semibold text-blue-100">Generation Type</h2>
      <div className="p-1 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
        <div className="flex gap-1">
          <button
            onClick={() => onModeChange('high-level')}
            className={cn(
              'flex-1 relative px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group',
              'focus:outline-none',
              mode === 'high-level' 
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
            )}
          >
            <DocumentMagnifyingGlassIcon className={cn(
              "h-5 w-5 transition-colors duration-300",
              mode === 'high-level' ? 'text-blue-200' : 'text-blue-300 group-hover:text-blue-200'
            )} />
            <span>High-level</span>
            {mode === 'high-level' && (
              <div className="absolute inset-0 rounded-xl bg-blue-400/10 animate-pulse -z-10"></div>
            )}
          </button>
          <button
            onClick={() => onModeChange('detailed')}
            className={cn(
              'flex-1 relative px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group',
              'focus:outline-none',
              mode === 'detailed'
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
            )}
          >
            <DocumentTextIcon className={cn(
              "h-5 w-5 transition-colors duration-300",
              mode === 'detailed' ? 'text-blue-200' : 'text-blue-300 group-hover:text-blue-200'
            )} />
            <span>Detailed</span>
            {mode === 'detailed' && (
              <div className="absolute inset-0 rounded-xl bg-blue-400/10 animate-pulse -z-10"></div>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-blue-300 text-center">
          {mode === 'detailed' 
            ? 'Generate detailed test cases with step-by-step instructions'
            : 'Generate high-level test scenarios and acceptance criteria'
          }
        </p>
      </div>
    </div>
  );
} 