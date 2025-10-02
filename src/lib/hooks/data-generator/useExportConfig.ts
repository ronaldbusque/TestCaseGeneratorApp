import { useCallback, useState } from 'react';

import { DEFAULT_EXPORT_CONFIG } from '@/lib/data-generator/constants';
import type { ExportConfig, ExportValidationResult } from '@/lib/data-generator/types';

interface UseExportConfigOptions {
  initialConfig?: ExportConfig;
}

export const useExportConfig = (options?: UseExportConfigOptions) => {
  const [config, setConfig] = useState<ExportConfig>(
    () => options?.initialConfig ?? DEFAULT_EXPORT_CONFIG
  );

  const updateConfig = useCallback((patch: Partial<ExportConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const replaceConfig = useCallback((next: ExportConfig) => {
    setConfig(next);
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_EXPORT_CONFIG);
  }, []);

  const validateAgainstSchema = useCallback(
    (hasAIGeneratedFields: boolean): ExportValidationResult => {
      if (hasAIGeneratedFields && !config.enhancementPrompt.trim()) {
        return {
          ok: false,
          message:
            'You have AI-Generated fields but no context is provided. Please add context to help the AI generate appropriate values.',
          error: { type: 'missingAIPrompt' },
        };
      }

      if (config.useDeterministicSeed && !config.seedValue.trim()) {
        return {
          ok: false,
          message: 'Please provide a seed value or disable deterministic mode.',
          error: { type: 'missingSeed' },
        };
      }

      return { ok: true };
    },
    [config.enhancementPrompt, config.seedValue, config.useDeterministicSeed]
  );

  return {
    config,
    setConfig: replaceConfig,
    updateConfig,
    resetConfig,
    validateAgainstSchema,
  };
};

export type UseExportConfigReturn = ReturnType<typeof useExportConfig>;
