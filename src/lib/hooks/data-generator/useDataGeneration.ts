import { useCallback, useState } from 'react';

import { DEFAULT_FILE_PREFIX, DEFAULT_SQL_TABLE_NAME, PREVIEW_ROW_COUNT } from '@/lib/data-generator/constants';
import type {
  ExportConfig,
  ExportValidationResult,
  FieldOptions,
  SchemaValidationResult,
} from '@/lib/data-generator/types';
import { fetchApi } from '@/lib/utils/apiClient';

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

interface GeneratedDataResponse {
  data: Array<Record<string, unknown>>;
  error?: string;
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
}: UseDataGenerationParams) => {
  const [previewDataRows, setPreviewDataRows] = useState<Array<Record<string, unknown>>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
      anchor.download = `${DEFAULT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      anchor.remove();
    },
    []
  );

  const exportData = useCallback(async () => {
    if (!ensureReady()) {
      return;
    }

    setIsGenerating(true);

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
      )) as GeneratedDataResponse;

      if (!generatedData?.data || generatedData.data.length === 0) {
        toast({
          title: 'No Data Generated',
          description: 'The generation process did not produce any data.',
          variant: 'destructive',
        });
        return;
      }

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
        anchor.download = `${DEFAULT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        window.URL.revokeObjectURL(url);
        anchor.remove();

        toast({
          title: exportConfig.enhancementPrompt.trim() && hasAIGeneratedFields
            ? 'Data Generated with AI Enhancement'
            : 'Export Successful',
          description: `Generated ${generatedData.data.length} rows of data.`,
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
        downloadFile(content, 'text/csv', 'csv');
      } else if (exportConfig.format === 'JSON') {
        downloadFile(JSON.stringify(generatedData.data, null, 2), 'application/json', 'json');
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

        downloadFile(sql, 'text/plain', 'sql');
      }

      toast({
        title: exportConfig.enhancementPrompt.trim() && hasAIGeneratedFields
          ? 'Data Generated with AI Enhancement'
          : 'Export Successful',
        description: `Generated ${generatedData.data.length} rows of data.`,
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
      )) as GeneratedDataResponse;

      if (result.data && result.data.length > 0) {
        setPreviewDataRows(result.data);
        setIsPreviewMode(true);
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
    hasAIGeneratedFields,
    mapFieldsToApi,
    model,
    provider,
    toast,
    validateExportConfig,
    validateSchema,
  ]);

  const clearPreview = useCallback(() => {
    setPreviewDataRows([]);
    setIsPreviewMode(false);
  }, []);

  return {
    exportData,
    generatePreview,
    clearPreview,
    previewDataRows,
    isGenerating,
    isPreviewMode,
  };
};

export type UseDataGenerationReturn = ReturnType<typeof useDataGeneration>;
