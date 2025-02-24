'use client';

import { Switch } from '@headlessui/react';
import { TestPriorityMode, TestCaseMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TestPriorityToggleProps {
  priorityMode: TestPriorityMode;
  onPriorityChange: (mode: TestPriorityMode) => void;
  testCaseMode: TestCaseMode;
  className?: string;
}

export function TestPriorityToggle({
  priorityMode,
  onPriorityChange,
  testCaseMode,
  className
}: TestPriorityToggleProps) {
  const isComprehensive = priorityMode === 'comprehensive';
  const isDetailedMode = testCaseMode === 'detailed';

  return (
    <div className={cn('space-y-3', className)}>
      <h2 className="text-lg font-semibold text-blue-100">Test Coverage Priority</h2>
      <div className="p-3 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={isComprehensive}
              onChange={(checked) => onPriorityChange(checked ? 'comprehensive' : 'core-functionality')}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent',
                isComprehensive ? 'bg-blue-500' : 'bg-gray-600'
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
            <span className="text-sm font-medium text-blue-100">
              {isComprehensive ? 'Comprehensive Coverage' : 'Core Functionality'}
            </span>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-blue-300 pl-14">
            {isComprehensive 
              ? 'Generate extensive test cases covering edge cases and all scenarios'
              : 'Focus on essential functionality and critical path testing'
            }
          </p>
          {isDetailedMode && isComprehensive && (
            <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
              <InformationCircleIcon className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-200">
                Note: When using detailed test generation, comprehensive coverage may be limited by token constraints. Consider using core functionality mode for more efficient token usage.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 