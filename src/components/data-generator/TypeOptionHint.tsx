'use client';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

interface TypeOptionHintProps {
  title: string;
  children: ReactNode;
  tone?: 'info' | 'warning';
}

const toneStyles: Record<Required<TypeOptionHintProps>['tone'], string> = {
  info: 'border-blue-500/50 text-slate-200',
  warning: 'border-amber-500/50 text-amber-200',
};

export function TypeOptionHint({ title, children, tone = 'info' }: TypeOptionHintProps) {
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-xs ${toneStyles[tone]}`}>
      <InformationCircleIcon className="h-4 w-4 mt-0.5" />
      <div>
        <p className="font-semibold uppercase tracking-wide text-[11px] mb-1">{title}</p>
        <div className="text-slate-300 leading-snug">{children}</div>
      </div>
    </div>
  );
}
