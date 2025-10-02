import { useMemo } from 'react';

import type { FieldDefinition } from '@/lib/data-generator/types';

interface RelationalPreviewProps {
  data: Array<Record<string, unknown>>;
  fields: FieldDefinition[];
}

interface ReferenceSummary {
  field: FieldDefinition;
  sourceField: string;
  groups: Array<{
    sourceValue: string;
    rowIndexes: number[];
    mismatched: boolean;
  }>;
  mismatches: number;
}

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export function RelationalPreview({ data, fields }: RelationalPreviewProps) {
  const referenceSummaries = useMemo<ReferenceSummary[]>(() => {
    const referenceFields = fields.filter(
      (field): field is FieldDefinition & { options: FieldDefinition['options'] & { sourceField?: string } } =>
        field.type === 'Reference' && typeof field.options?.sourceField === 'string' && field.options.sourceField.trim().length > 0
    );

    return referenceFields.map((field) => {
      const sourceField = (field.options.sourceField ?? '').trim();
      const groupMap = new Map<string, { sourceValue: string; rowIndexes: number[]; mismatched: boolean }>();
      let mismatchCount = 0;

      data.forEach((row, rowIndex) => {
        const source = stringifyValue(row[sourceField]);
        const reference = stringifyValue(row[field.name]);
        const key = `${source}|${reference}`;

        const mismatched = source !== reference;
        if (mismatched) {
          mismatchCount += 1;
        }

        const existing = groupMap.get(key);
        if (existing) {
          existing.rowIndexes.push(rowIndex + 1);
          existing.mismatched = existing.mismatched || mismatched;
        } else {
          groupMap.set(key, {
            sourceValue: `${source} → ${reference}`,
            rowIndexes: [rowIndex + 1],
            mismatched,
          });
        }
      });

      const groups = Array.from(groupMap.values()).map((entry) => ({
        sourceValue: entry.sourceValue,
        rowIndexes: entry.rowIndexes,
        mismatched: entry.mismatched,
      }));

      return {
        field,
        sourceField,
        groups,
        mismatches: mismatchCount,
      } satisfies ReferenceSummary;
    });
  }, [data, fields]);

  if (referenceSummaries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-300">
        <p>No reference fields detected in this schema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {referenceSummaries.map(({ field, sourceField, groups, mismatches }) => (
        <section
          key={field.id}
          className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
            <div>
              <p className="text-white font-semibold">{field.name || 'Untitled reference field'}</p>
              <p className="text-xs text-slate-400">References: {sourceField}</p>
            </div>
            <div className={`text-xs font-medium ${mismatches > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {mismatches > 0 ? `${mismatches} mismatched row${mismatches === 1 ? '' : 's'}` : 'All rows aligned'}
            </div>
          </header>

          {groups.length === 0 ? (
            <p className="pt-3 text-xs text-slate-400">No preview rows available yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-800/70 uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Source → Reference</th>
                    <th className="px-3 py-2">Rows</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, index) => (
                    <tr key={`${field.id}-${index}`} className="border-b border-slate-800/60">
                      <td className="px-3 py-2 font-mono text-slate-100">{group.sourceValue}</td>
                      <td className="px-3 py-2 text-slate-200">{group.rowIndexes.join(', ')}</td>
                      <td className="px-3 py-2">
                        {group.mismatched ? (
                          <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-200">Mismatch</span>
                        ) : (
                          <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200">Match</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
