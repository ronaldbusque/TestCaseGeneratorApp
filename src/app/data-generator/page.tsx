'use client';

import { SchemaBuilder } from '@/components/data-generator/SchemaBuilder';
import { ExportOptions } from '@/components/data-generator/ExportOptions';
import { DataPreviewTable } from '@/components/data-generator/DataPreviewTable';
import { RawDataPreview } from '@/components/data-generator/RawDataPreview';
import { Tab } from '@headlessui/react';
import { TableCellsIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { DataGeneratorLoading } from '@/components/data-generator/DataGeneratorLoading';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { QuickModelSwitcher } from '@/components/QuickModelSwitcher';
import { useSchemaBuilder } from '@/lib/hooks/data-generator/useSchemaBuilder';
import { useExportConfig } from '@/lib/hooks/data-generator/useExportConfig';
import { useDataGeneration } from '@/lib/hooks/data-generator/useDataGeneration';
import { AIPromptSuggestions } from '@/components/data-generator/AIPromptSuggestions';

interface Toast {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

const useToast = () => {
  const toast = (params: Toast) => {
    console.log(`TOAST: ${params.title} - ${params.description}`);
  };

  return { toast };
};

export default function TestDataGeneratorPage() {
  const { settings } = useProviderSettings();
  const schema = useSchemaBuilder();
  const {
    config: exportConfig,
    setConfig: setExportConfig,
    updateConfig: updateExportConfig,
    validateAgainstSchema,
  } = useExportConfig();
  const { toast } = useToast();

  const {
    exportData,
    generatePreview,
    clearPreview,
    previewDataRows,
    isGenerating,
    isPreviewMode,
  } = useDataGeneration({
    exportConfig,
    hasAIGeneratedFields: schema.hasAIGeneratedFields,
    mapFieldsToApi: schema.mapFieldsToApi,
    validateSchema: schema.validateSchema,
    validateExportConfig: validateAgainstSchema,
    provider: settings.data.provider,
    model: settings.data.model,
    toast,
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
          Test Data Generator
        </h1>
        <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
          Create realistic test data with AI-powered enhancement capabilities
        </p>
      </div>

      <div className="mb-6 flex justify-center sm:justify-end">
        <QuickModelSwitcher domain="data" />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Define Your Schema</h2>
          <SchemaBuilder
            fields={schema.fields}
            onChange={schema.setFields}
            onAddField={schema.addField}
            onRemoveField={schema.removeField}
            onDuplicateField={schema.duplicateField}
            onMoveField={schema.reorderField}
            onFieldUpdate={schema.updateField}
            onFieldOptionsUpdate={schema.updateFieldOptions}
            onReplaceAll={schema.setFields}
          />
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Export Options</h2>
          <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
            <ExportOptions
              config={exportConfig}
              onConfigChange={setExportConfig}
              onExport={exportData}
              onPreview={generatePreview}
              hasAIGeneratedFields={schema.hasAIGeneratedFields}
            />
            <AIPromptSuggestions
              currentPrompt={exportConfig.enhancementPrompt}
              disabled={!schema.hasAIGeneratedFields}
              onSelect={(prompt) =>
                updateExportConfig({
                  enhancementPrompt: prompt,
                  applyAIEnhancement: true,
                })
              }
            />
          </div>
        </div>

        {isPreviewMode && previewDataRows.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Data Preview</h2>
              <button
                onClick={clearPreview}
                className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>

            <Tab.Group>
              <Tab.List className="flex space-x-1 rounded-xl bg-slate-700/50 p-1 mb-4">
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                      selected
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    } flex items-center justify-center`
                  }
                >
                  <TableCellsIcon className="h-5 w-5 mr-2" />
                  Table View
                </Tab>
                <Tab
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                      selected
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    } flex items-center justify-center`
                  }
                >
                  <CodeBracketIcon className="h-5 w-5 mr-2" />
                  Raw Format ({exportConfig.format})
                </Tab>
              </Tab.List>
              <Tab.Panels>
                <Tab.Panel>
                  <DataPreviewTable data={previewDataRows} />
                </Tab.Panel>
                <Tab.Panel>
                  <RawDataPreview
                    data={previewDataRows}
                    format={exportConfig.format}
                    options={{
                      lineEnding: exportConfig.lineEnding,
                      includeHeader: exportConfig.includeHeader,
                      includeBOM: exportConfig.includeBOM,
                    }}
                  />
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-center items-center p-12 bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700">
            <DataGeneratorLoading message="Generating test data..." />
          </div>
        )}
      </div>
    </main>
  );
}
