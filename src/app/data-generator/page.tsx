'use client';

import { useMemo } from 'react';

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
import { PreviewController } from '@/components/data-generator/PreviewController';
import { RelationalPreview } from '@/components/data-generator/RelationalPreview';

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
    generateAiSample,
    clearPreview,
    previewDataRows,
    aiSampleRow,
    generationMetadata,
    isGenerating,
    isFetchingAiSample,
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

  const aiFieldNames = useMemo(
    () => schema.fields.filter((field) => field.type === 'AI-Generated').map((field) => field.name),
    [schema.fields]
  );

  const referenceFields = schema.fields.filter((field) => field.type === 'Reference');

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

      <div className="space-y-8">
        <section>
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
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-3">Export Options</h2>
            <p className="text-sm text-slate-300 mb-4">
              Configure your baseline dataset first. If you enable AI enhancement, provide clear instructions so
              generated fields follow the guidance you expect.
            </p>
            <ExportOptions
              config={exportConfig}
              onConfigChange={setExportConfig}
              onExport={exportData}
              onPreview={generatePreview}
              hasAIGeneratedFields={schema.hasAIGeneratedFields}
            />
          </div>

          <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700 p-4 space-y-3">
            <header className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">AI Prompt Guidance</h2>
              <span className="text-xs text-slate-300">
                Prompts feed the &quot;AI Enhancement&quot; field inside Export Options.
              </span>
            </header>
            <p className="text-sm text-slate-300">
              Pick a preset or write your own prompt, then click <span className="font-semibold">Use</span> to copy it
              into the enhancement prompt. AI instructions only affect fields marked as &quot;AI-Generated.&quot; Use
              <span className="font-semibold"> Preview</span> to sanity-check a single row before exporting.
            </p>
            <AIPromptSuggestions
              currentPrompt={exportConfig.enhancementPrompt}
              disabled={!schema.hasAIGeneratedFields}
              aiFieldNames={aiFieldNames}
              sampleRow={aiSampleRow}
              isSampleLoading={isFetchingAiSample}
              onGenerateSample={generateAiSample}
              onSelect={(prompt) =>
                updateExportConfig({
                  enhancementPrompt: prompt,
                  applyAIEnhancement: true,
                })
              }
            />
          </div>
        </section>

        {isPreviewMode && previewDataRows.length > 0 && (
          <section className="space-y-4">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">Data Preview</h2>
            </header>

            <PreviewController
              data={previewDataRows}
              format={exportConfig.format}
              options={{
                lineEnding: exportConfig.lineEnding,
                includeHeader: exportConfig.includeHeader,
                includeBOM: exportConfig.includeBOM,
              }}
              metadata={generationMetadata}
              isRefreshing={isGenerating}
              onRefresh={generatePreview}
              onClose={clearPreview}
              toast={toast}
            />

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
                {referenceFields.length > 0 && (
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                        selected
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      } flex items-center justify-center`
                    }
                  >
                    Relationships
                  </Tab>
                )}
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
                {referenceFields.length > 0 && (
                  <Tab.Panel>
                    <RelationalPreview data={previewDataRows} fields={referenceFields} />
                  </Tab.Panel>
                )}
              </Tab.Panels>
            </Tab.Group>
          </section>
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
