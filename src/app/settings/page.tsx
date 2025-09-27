'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { LLMProvider } from '@/lib/types/providers';
import { Button } from '@/components/ui/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const DOMAIN_LABELS = {
  testCases: 'Test Case Generator',
  sql: 'SQL Assistant',
  data: 'Test Data Generator',
} as const;

const COMPACT_FIELD_CLASS = 'h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm';
const PROVIDER_SELECT_CLASS = `${COMPACT_FIELD_CLASS} pr-8`;

export default function SettingsPage() {
  const {
    settings,
    availableProviders,
    quickSelections,
    updateProvider,
    updateModel,
    resetSettings,
    addQuickSelection,
    updateQuickSelection,
    removeQuickSelection,
    loading,
    providerError,
  } = useProviderSettings();

  const providerOptions = useMemo(() => (
    availableProviders.map((provider) => ({
      value: provider.id,
      label: provider.label,
      description: provider.description,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
      models: provider.models ?? [],
      status: provider.status ?? null,
    }))
  ), [availableProviders]);

  const providerMap = useMemo(
    () => new Map(providerOptions.map((option) => [option.value, option])),
    [providerOptions]
  );

  const statusAccent: Record<string, string> = {
    ok: 'text-emerald-400',
    warning: 'text-amber-300',
    error: 'text-rose-400',
  };

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
          ) : availableProviders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 text-center text-blue-100">
              <p className="text-sm font-semibold">No providers available.</p>
              <p className="mt-2 text-xs text-blue-200/70">
                {providerError ? providerError : 'Add provider API keys and ensure your access token is saved to view and edit provider settings.'}
              </p>
            </div>
          ) : (
            (Object.entries(DOMAIN_LABELS) as Array<[keyof typeof DOMAIN_LABELS, string]>).map(([domain, label]) => {
              const selection = settings[domain];
              const selectedOption = providerMap.get(selection.provider);
              const status = selectedOption?.status ?? null;
              const lastCheckedLabel = status?.fetchedAt
                ? new Date(status.fetchedAt).toLocaleTimeString()
                : null;
              const statusErrorSuffix = status?.error ? ` · ${status.error}` : '';

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
                        className={PROVIDER_SELECT_CLASS}
                      >
                        {providerOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900 text-blue-50">
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="w-full sm:w-64">
                        {selectedOption && (
                          <datalist id={`model-options-${domain}-${selection.provider}`}>
                            {selectedOption.models?.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label ?? model.id}
                              </option>
                            ))}
                          </datalist>
                        )}
                        <input
                          type="text"
                          list={`model-options-${domain}-${selection.provider}`}
                          value={selection.model}
                          onChange={(event) => updateModel(domain, event.target.value)}
                          placeholder={selectedOption?.defaultModel || selectedOption?.models?.[0]?.id || 'Select or type model'}
                          className={`w-full ${COMPACT_FIELD_CLASS}`}
                        />
                        <p className="mt-1 text-[0.7rem] text-blue-200/60">
                          {selectedOption?.models?.length
                            ? 'Start typing to filter live model suggestions.'
                            : 'Enter the model identifier published by your provider.'}
                        </p>
                      </div>
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
                  {status && (
                    <div className="mt-4 text-xs">
                      <p className={`${statusAccent[status.severity] ?? 'text-blue-200'} font-semibold`}>
                        {status.headline}
                      </p>
                      {status.detail && (
                        <p className="text-blue-200/70">{status.detail}</p>
                      )}
                      {lastCheckedLabel && (
                        <p className="text-blue-200/50 mt-1">
                          Last checked {lastCheckedLabel}
                          {statusErrorSuffix}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-50">Quick model selections</h2>
              <p className="text-sm text-blue-200/80">
                Pick your go-to models for fast switching across the generator, SQL assistant, and data tools.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={addQuickSelection}
              className="flex items-center gap-2 border border-white/10 bg-white/10 text-blue-50 hover:bg-white/20"
            >
              <PlusIcon className="h-4 w-4" />
              Add quick selection
            </Button>
          </div>

          <div className="mt-6 space-y-5">
            {quickSelections.length === 0 ? (
              <p className="text-sm text-blue-200/80">
                No quick selections configured yet. Use the button above to add models you want to swap to with a single click.
              </p>
            ) : (
              quickSelections.map((selection) => {
                const providerOption = providerMap.get(selection.provider);
                const datalistId = `quick-model-options-${selection.id}`;

                return (
                  <div key={selection.id} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wide text-blue-200/60">Display label</label>
                        <input
                          type="text"
                          value={selection.label ?? ''}
                          onChange={(event) => updateQuickSelection(selection.id, { label: event.target.value })}
                          placeholder={`${providerOption?.label ?? selection.provider} · ${selection.model}`}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="text-xs uppercase tracking-wide text-blue-200/60">Provider</label>
                        <select
                          value={selection.provider}
                          onChange={(event) => updateQuickSelection(selection.id, { provider: event.target.value as LLMProvider })}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                        >
                          {providerOptions.map((option) => (
                            <option key={option.value} value={option.value} className="bg-slate-900 text-blue-50">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        {providerOption && (
                          <datalist id={datalistId}>
                            {providerOption.models?.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label ?? model.id}
                              </option>
                            ))}
                          </datalist>
                        )}
                        <label className="text-xs uppercase tracking-wide text-blue-200/60">Model</label>
                        <input
                          type="text"
                          list={providerOption ? datalistId : undefined}
                          value={selection.model}
                          onChange={(event) => updateQuickSelection(selection.id, { model: event.target.value })}
                          placeholder={providerOption?.defaultModel || providerOption?.models?.[0]?.id || 'Enter model ID'}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => removeQuickSelection(selection.id)}
                          className="flex items-center gap-1 bg-white/10 text-blue-200 hover:text-rose-200 hover:bg-white/20"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

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
