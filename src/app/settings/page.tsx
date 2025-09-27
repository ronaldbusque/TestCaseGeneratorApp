'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { LLMProvider } from '@/lib/types/providers';
import { Button } from '@/components/ui/Button';

const DOMAIN_LABELS = {
  testCases: 'Test Case Generator',
  sql: 'SQL Assistant',
  data: 'Test Data Generator',
} as const;

export default function SettingsPage() {
  const {
    settings,
    availableProviders,
    updateProvider,
    updateModel,
    resetSettings,
    loading,
  } = useProviderSettings();

  const providerOptions = useMemo(() => (
    availableProviders.map((provider) => ({
      value: provider.id,
      label: provider.label,
      description: provider.description,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
    }))
  ), [availableProviders]);

  const providerMap = useMemo(() => new Map(providerOptions.map((option) => [option.value, option])), [providerOptions]);

  return (
    <div className="relative py-12">
      <div className="max-w-4xl mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200"
          >
            Provider Settings
          </motion.h1>
          <p className="text-blue-100 max-w-2xl mx-auto">
            Choose which large language model provider powers each capability. Only providers with API keys in your environment are available.
          </p>
        </div>

        <div className="grid gap-6">
          {loading ? (
            <div className="text-center text-blue-200">Loading available providers...</div>
          ) : (
            (Object.entries(DOMAIN_LABELS) as Array<[keyof typeof DOMAIN_LABELS, string]>).map(([domain, label]) => {
              const selection = settings[domain];
              const selectedOption = providerMap.get(selection.provider);

              return (
                <motion.div
                  key={domain}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-blue-50">{label}</h2>
                      <p className="text-sm text-blue-200/80">
                        Select which provider should respond to {label.toLowerCase()} requests.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <select
                        value={selection.provider}
                        onChange={(event) => updateProvider(domain, event.target.value as LLMProvider)}
                        className="bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                      >
                        {providerOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900 text-blue-50">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={selection.model}
                        onChange={(event) => updateModel(domain, event.target.value)}
                        placeholder={selectedOption?.defaultModel || 'Enter model name'}
                        className="w-full sm:w-64 bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  {(selectedOption?.description || selectedOption?.baseUrl) && (
                    <div className="mt-3 text-xs text-blue-200/70 space-y-1">
                      {selectedOption?.description && <p>{selectedOption.description}</p>}
                      {selectedOption?.baseUrl && (
                        <p>Base URL: <span className="text-blue-100">{selectedOption.baseUrl}</span></p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-blue-200/70">
            Resetting restores each tool to the first available provider and its default model.
          </div>
          <Button
            type="button"
            variant="secondary"
            className="border border-white/10 bg-white/10 text-blue-50 hover:bg-white/20"
            onClick={resetSettings}
          >
            Reset to defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
