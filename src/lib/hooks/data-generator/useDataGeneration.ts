import { useCallback, useState } from 'react';

import { DEFAULT_FILE_PREFIX, DEFAULT_SQL_TABLE_NAME, PREVIEW_ROW_COUNT } from '@/lib/data-generator/constants';
import type {
  ExportConfig,
  ExportValidationResult,
  FieldOptions,
  SchemaValidationResult,
} from '@/lib/data-generator/types';
import { fetchApi } from '@/lib/utils/apiClient';
import type { TestDataGenerationMetadata, TestDataGenerationResponse } from '@/lib/types/testData';

interface ToastParams {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

interface UseDataGenerationParams {
  exportConfig: ExportConfig;
  hasAIGeneratedFields: boolean;
  mapFieldsToApi: () => Array<{ name: string; type: string; options: FieldOptions }>;
  validateSchema: () => SchemaValidationResult;
  validateExportConfig: (hasAIGeneratedFields: boolean) => ExportValidationResult;
  provider?: string;
  model?: string;
  toast: (params: ToastParams) => void;
}

const WINDOWS_LINE_ENDING = '\r\n';
const UNIX_LINE_ENDING = '\n';

const resolveValidationTitle = (
  result: SchemaValidationResult | ExportValidationResult
): string => {
  if ('error' in result && result.error) {
    switch (result.error.type) {
      case 'empty':
        return 'No fields defined';
      case 'missingType':
        return 'Missing field types';
      case 'missingAIPrompt':
        return 'AI Context Missing';
      default:
        return 'Validation Issue';
    }
  }
  return 'Validation Issue';
};

const getLineEnding = (lineEnding: ExportConfig['lineEnding']) =>
  lineEnding === 'Windows (CRLF)' ? WINDOWS_LINE_ENDING : UNIX_LINE_ENDING;

export const useDataGeneration = ({
  exportConfig,
  hasAIGeneratedFields,
  mapFieldsToApi,
  validateSchema,
  validateExportConfig,
  provider,
  model,
  toast,
  onGenerationStart,
}: UseDataGenerationParams & { onGenerationStart?: () => void }) => {
  const [previewDataRows, setPreviewDataRows] = useState<Array<Record<string, unknown>>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [aiSampleRow, setAiSampleRow] = useState<Record<string, unknown> | null>(null);
  const [isFetchingAiSample, setIsFetchingAiSample] = useState(false);
  const [generationMetadata, setGenerationMetadata] = useState<TestDataGenerationMetadata | null>(null);

  const reportMetadata = useCallback(
    (metadata?: TestDataGenerationMetadata) => {
      const next = metadata ?? null;
      setGenerationMetadata((previous) => {
        const prevKey = previous ? JSON.stringify(previous) : null;
        const nextKey = next ? JSON.stringify(next) : null;

        if (next && nextKey !== prevKey) {
          next.warnings?.forEach((warning) => {
            toast({
              title: 'Determinism Notice',
              description: warning,
              variant: 'default',
            });
          });

          if (exportConfig.useDeterministicSeed && !next.deterministic) {
            toast({
              title: 'Deterministic Mode Not Guaranteed',
              description: 'Some generators or AI enhancements can vary between runs even with a seed.',
              variant: 'destructive',
            });
          }
        }

        return next;
      });
    },
    [exportConfig.useDeterministicSeed, toast]
  );

  const ensureReady = useCallback(() => {
    const schemaValidation = validateSchema();
    if (!schemaValidation.ok) {
      toast({
        title: resolveValidationTitle(schemaValidation),
        description: schemaValidation.message ?? 'Schema validation failed.',
        variant: 'destructive',
      });
      return false;
    }

    const exportValidation = validateExportConfig(hasAIGeneratedFields);
    if (!exportValidation.ok) {
      toast({
        title: resolveValidationTitle(exportValidation),
        description: exportValidation.message ?? 'Export configuration invalid.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, [
    hasAIGeneratedFields,
    toast,
    validateExportConfig,
    validateSchema,
  ]);

  const downloadFile = useCallback(
    (content: BlobPart, type: string, extension: string) => {
      const blob = new Blob([content], { type });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const filename = `${DEFAULT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.${extension}`;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      anchor.remove();
      return filename;
    },
    []
  );

  const exportData = useCallback(async () => {
    if (!ensureReady()) {
      return;
    }

    setIsGenerating(true);
    onGenerationStart?.();

    try {
      const payload = {
        fields: mapFieldsToApi(),
        count: exportConfig.rowCount,
        format: exportConfig.format,
        options: {
          lineEnding: exportConfig.lineEnding,
          includeHeader: exportConfig.includeHeader,
          includeBOM: exportConfig.includeBOM,
        },
        ...(exportConfig.enhancementPrompt.trim()
          ? { aiEnhancement: exportConfig.enhancementPrompt.trim() }
          : {}),
        provider,
        model,
        ...(exportConfig.useDeterministicSeed && exportConfig.seedValue.trim()
          ? { seed: exportConfig.seedValue.trim() }
          : {}),
      };

      const generatedData = (await fetchApi(
        '/api/data-generator/generate',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )) as TestDataGenerationResponse;

      if (!generatedData?.data || generatedData.data.length === 0) {
        toast({
          title: 'No Data Generated',
          description: 'The generation process did not produce any data.',
          variant: 'destructive',
        });
        reportMetadata(generatedData.metadata);
        return;
      }

      const sample = generatedData.data.slice(0, PREVIEW_ROW_COUNT);
      setPreviewDataRows(sample);
      setIsPreviewMode(true);

      reportMetadata(generatedData.metadata);

      let downloadedFilename: string | null = null;
      const rowsGenerated = generatedData.data.length;
      const usedAI = Boolean(exportConfig.enhancementPrompt.trim() && hasAIGeneratedFields);

      if (exportConfig.format === 'Excel') {
        const blob = await fetchApi<Blob>(
          '/api/data-generator/export-excel',
          {
            method: 'POST',
            body: JSON.stringify({ data: generatedData.data }),
            headers: { Accept: 'application/octet-stream' },
          },
          true
        );

        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        downloadedFilename = `${DEFAULT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        anchor.download = downloadedFilename;
        document.body.appendChild(anchor);
        anchor.click();
        window.URL.revokeObjectURL(url);
        anchor.remove();

        toast({
          title: usedAI ? 'Data Generated with AI Enhancement' : 'Export Successful',
          description: `Downloaded ${downloadedFilename} with ${rowsGenerated} rows. Check your browser downloads.`,
          variant: 'default',
        });
        return;
      }

      if (exportConfig.format === 'CSV') {
        const data = generatedData.data;
        const delimiter = getLineEnding(exportConfig.lineEnding);
        const header = exportConfig.includeHeader
          ? `${Object.keys(data[0]).join(',')}${delimiter}`
          : '';

        const rows = data
          .map((row) =>
            Object.values(row)
              .map((value) =>
                typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value ?? ''
              )
              .join(',')
          )
          .join(delimiter);

        const content = exportConfig.includeBOM ? `\ufeff${header}${rows}` : `${header}${rows}`;
        downloadedFilename = downloadFile(content, 'text/csv', 'csv');
      } else if (exportConfig.format === 'JSON') {
        downloadedFilename = downloadFile(
          JSON.stringify(generatedData.data, null, 2),
          'application/json',
          'json'
        );
      } else if (exportConfig.format === 'SQL') {
        const delimiter = getLineEnding(exportConfig.lineEnding);
        const data = generatedData.data;
        const columns = Object.keys(data[0]);

        const sql = data
          .map((row) => {
            const values = Object.values(row)
              .map((value) => {
                if (value === null || value === undefined) return 'NULL';
                if (typeof value === 'string') return `'${(value as string).replace(/'/g, "''")}'`;
                return value;
              })
              .join(', ');
            return `INSERT INTO ${DEFAULT_SQL_TABLE_NAME} (${columns.join(', ')}) VALUES (${values});`;
          })
          .join(delimiter);

        downloadedFilename = downloadFile(sql, 'text/plain', 'sql');
      }

      toast({
        title: usedAI ? 'Data Generated with AI Enhancement' : 'Export Successful',
        description: downloadedFilename
          ? `Downloaded ${downloadedFilename} with ${rowsGenerated} rows. Check your browser downloads.`
          : `Generated ${rowsGenerated} rows of data.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error generating data:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Generation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    ensureReady,
    exportConfig.enhancementPrompt,
    exportConfig.format,
    exportConfig.includeBOM,
    exportConfig.includeHeader,
    exportConfig.lineEnding,
    exportConfig.rowCount,
    exportConfig.seedValue,
    exportConfig.useDeterministicSeed,
    downloadFile,
    hasAIGeneratedFields,
    mapFieldsToApi,
    model,
    provider,
    reportMetadata,
    toast,
  ]);

  const generatePreview = useCallback(async () => {
    const schemaValidation = validateSchema();
    if (!schemaValidation.ok) {
      toast({
        title: resolveValidationTitle(schemaValidation),
        description: schemaValidation.message ?? 'Schema validation failed.',
        variant: 'destructive',
      });
      return;
    }

    const exportValidation = validateExportConfig(hasAIGeneratedFields);
    if (!exportValidation.ok) {
      toast({
        title: resolveValidationTitle(exportValidation),
        description: exportValidation.message ?? 'Export configuration invalid.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    onGenerationStart?.();

    try {
      const result = (await fetchApi(
        '/api/data-generator/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            fields: mapFieldsToApi(),
            count: PREVIEW_ROW_COUNT,
            format: 'JSON',
            ...(exportConfig.enhancementPrompt.trim()
              ? { aiEnhancement: exportConfig.enhancementPrompt.trim() }
              : {}),
            provider,
            model,
            ...(exportConfig.useDeterministicSeed && exportConfig.seedValue.trim()
              ? { seed: exportConfig.seedValue.trim() }
              : {}),
          }),
        }
      )) as TestDataGenerationResponse;

      if (result.data && result.data.length > 0) {
        setPreviewDataRows(result.data);
        setIsPreviewMode(true);
        reportMetadata(result.metadata);
        toast({
          title: 'Data Generated',
          description: `Successfully generated ${result.data.length} records`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'No Data Generated',
          description: 'The generation process did not produce any data.',
          variant: 'destructive',
        });
        reportMetadata(result.metadata);
      }
    } catch (error) {
      console.error('Error generating data:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Generation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    exportConfig.enhancementPrompt,
    exportConfig.seedValue,
    exportConfig.useDeterministicSeed,
    hasAIGeneratedFields,
    mapFieldsToApi,
    model,
    provider,
    reportMetadata,
    toast,
    validateExportConfig,
    validateSchema,
  ]);

  const clearPreview = useCallback(() => {
    setPreviewDataRows([]);
    setIsPreviewMode(false);
  }, []);

  const generateAiSample = useCallback(async () => {
    if (!hasAIGeneratedFields) {
      toast({
        title: 'No AI Fields',
        description: 'Add an AI-Generated field to preview AI output.',
        variant: 'destructive',
      });
      return;
    }

    if (!ensureReady()) {
      return;
    }

    setIsFetchingAiSample(true);
    onGenerationStart?.();
    try {
      const result = (await fetchApi(
        '/api/data-generator/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            fields: mapFieldsToApi(),
            count: 1,
            format: 'JSON',
            ...(exportConfig.enhancementPrompt.trim()
              ? { aiEnhancement: exportConfig.enhancementPrompt.trim() }
              : {}),
            provider,
            model,
            ...(exportConfig.useDeterministicSeed && exportConfig.seedValue.trim()
              ? { seed: exportConfig.seedValue.trim() }
              : {}),
          }),
        }
      )) as TestDataGenerationResponse;

      if (result.data && result.data.length > 0) {
        setAiSampleRow(result.data[0]);
        if (result.metadata) {
          reportMetadata(result.metadata);
        }
      } else {
        setAiSampleRow(null);
        toast({
          title: 'No AI Sample Available',
          description: 'The AI preview did not return any data.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating AI sample:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setAiSampleRow(null);
      toast({
        title: 'AI Preview Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsFetchingAiSample(false);
    }
  }, [
    ensureReady,
    exportConfig.enhancementPrompt,
    exportConfig.seedValue,
    exportConfig.useDeterministicSeed,
    hasAIGeneratedFields,
    mapFieldsToApi,
    model,
    provider,
    reportMetadata,
    toast,
  ]);

  return {
    exportData,
    generatePreview,
    generateAiSample,
    clearPreview,
    previewDataRows,
    aiSampleRow,
    generationMetadata,
    isGenerating,
    isFetchingAiSample,
    isPreviewMode,
  };
};

export type UseDataGenerationReturn = ReturnType<typeof useDataGeneration>;
