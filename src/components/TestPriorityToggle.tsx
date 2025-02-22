'use client';

import { Switch } from '@headlessui/react';
import { TestPriorityMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TestPriorityToggleProps {
  priorityMode: TestPriorityMode;
  onPriorityChange: (mode: TestPriorityMode) => void;
  className?: string;
}

export function TestPriorityToggle({
  priorityMode,
  onPriorityChange,
  className
}: TestPriorityToggleProps) {
  const isComprehensive = priorityMode === 'comprehensive';

  return (
    <div className={cn('space-y-3', className)}>
      <h2 className="text-lg font-semibold text-blue-100">Test Coverage Priority</h2>
      <div className="flex items-center space-x-3 p-3 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
        <Switch
          checked={isComprehensive}
          onChange={(checked) => onPriorityChange(checked ? 'comprehensive' : 'core-functionality')}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            isComprehensive ? 'bg-blue-500' : 'bg-gray-400'
          )}
        >
          <span className="sr-only">Toggle test coverage priority</span>
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              isComprehensive ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </Switch>
        <span className="text-sm text-blue-200">
          {isComprehensive ? 'Comprehensive Coverage' : 'Core Functionality'}
        </span>
        <div className="ml-2 text-xs text-blue-300">
          {isComprehensive 
            ? 'Generate extensive test cases covering edge cases and all scenarios'
            : 'Focus on essential functionality and critical path testing'
          }
        </div>
      </div>
    </div>
  );
} 