import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

import type { ExportConfig } from '@/lib/data-generator/types';
import { formatPreviewData } from '@/lib/data-generator/formatPreview';
import type { TestDataGenerationMetadata } from '@/lib/types/testData';

interface ToastParams {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

interface PreviewControllerProps {
  data: Array<Record<string, unknown>>;
  format: ExportConfig['format'];
  options: {
    lineEnding: ExportConfig['lineEnding'];
    includeHeader: boolean;
    includeBOM: boolean;
  };
  metadata: TestDataGenerationMetadata | null;
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  onClose: () => void;
  toast: (params: ToastParams) => void;
}

export function PreviewController({
  data,
  format,
  options,
  metadata,
  isRefreshing,
  onRefresh,
  onClose,
  toast,
}: PreviewControllerProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleRefresh = async () => {
    await onRefresh();
  };

  const handleCopy = async () => {
    if (!data.length) {
      toast({
        title: 'Nothing to copy',
        description: 'Generate a preview before copying.',
        variant: 'destructive',
      });
      return;
    }

    const { content } = formatPreviewData(data, format, options);
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Preview copied',
        description: 'Raw preview data is now on your clipboard.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: error instanceof Error ? error.message : 'Unable to copy preview data.',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = () => {
    if (!data.length) {
      toast({
        title: 'Nothing to download',
        description: 'Generate a preview before downloading.',
        variant: 'destructive',
      });
      return;
    }

    const { content, filename } = formatPreviewData(data, format, options);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    anchor.remove();

    toast({
      title: 'Preview downloaded',
      description: `Saved ${filename} to your device.`,
      variant: 'default',
    });
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-xs text-slate-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-white">
            Preview Summary · {data.length} rows · Format: {format}
          </p>
          {metadata && (
            <div className="space-y-1" aria-live="polite">
              <p className="text-slate-300">
                Engine: {metadata.engine === 'copycat' ? 'Copycat (deterministic mapping)' : 'Faker fallback'} ·
                Deterministic: {metadata.deterministic ? 'Yes' : 'No'}
              </p>
              {metadata.seed && (
                <p className="text-slate-400">
                  Seed: <span className="font-mono text-slate-200">{metadata.seed}</span>
                </p>
              )}
              {metadata.warnings?.map((warning) => (
                <p key={warning} className="text-amber-200">
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-white transition-colors ${
              isRefreshing
                ? 'cursor-not-allowed opacity-60'
                : 'hover:border-blue-400 hover:bg-blue-500/10'
            }`}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Preview
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            className={`flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-white transition-colors ${
              isCopying
                ? 'cursor-wait opacity-60'
                : 'hover:border-violet-400 hover:bg-violet-500/10'
            }`}
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Copy Raw Data
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-white transition-colors hover:border-emerald-400 hover:bg-emerald-500/10"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Download Preview
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-white transition-colors hover:border-red-400 hover:bg-red-500/10"
          >
            <XMarkIcon className="h-4 w-4" />
            Exit Preview
          </button>
        </div>
      </div>
    </div>
  );
}
