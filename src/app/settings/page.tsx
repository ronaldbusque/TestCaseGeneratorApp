'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { LLMProvider } from '@/lib/types/providers';
import { Button } from '@/components/ui/Button';
import { PlusIcon, TrashIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { fetchApi } from '@/lib/utils/apiClient';

const DOMAIN_LABELS = {
  testCases: 'Test Case Generator',
  sql: 'SQL Assistant',
  data: 'Test Data Generator',
} as const;

const COMPACT_FIELD_CLASS = 'h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm';
const PROVIDER_SELECT_CLASS = `${COMPACT_FIELD_CLASS} pr-8`;

type AdminStatus = 'loading' | 'allowed' | 'denied';

interface UsageSummary {
  userIdentifier: string;
  totalInteractions: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  providers: Record<string, number>;
  models: Record<string, number>;
  lastInteraction: string | null;
}

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

  const [adminStatus, setAdminStatus] = useState<AdminStatus>('loading');
  const [usageUsers, setUsageUsers] = useState<UsageSummary[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        await fetchApi('/api/auth/admin-check');
        setAdminStatus('allowed');
      } catch (error) {
        console.warn('Admin check failed', error);
        setAdminStatus('denied');
      }
    };

    verifyAdmin();
  }, []);

  const loadUsage = useCallback(async () => {
    if (adminStatus !== 'allowed') {
      return;
    }
    setUsageLoading(true);
    setUsageError(null);
    try {
      const data = await fetchApi<{ users?: UsageSummary[] }>('/api/logs/usage');
      const users = data.users ?? [];
      setUsageUsers(users);
      if (users.length > 0) {
        setSelectedUser((prev) => (prev && users.some((user) => user.userIdentifier === prev) ? prev : users[0].userIdentifier));
      } else {
        setSelectedUser('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load usage metrics';
      setUsageError(message);
      setUsageUsers([]);
      setSelectedUser('');
    } finally {
      setUsageLoading(false);
    }
  }, [adminStatus]);

  useEffect(() => {
    if (adminStatus !== 'allowed') {
      return;
    }
    loadUsage();
  }, [adminStatus, loadUsage]);

  const selectedSummary = useMemo(() => (
    usageUsers.find((entry) => entry.userIdentifier === selectedUser) ?? null
  ), [usageUsers, selectedUser]);

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

        {adminStatus === 'loading' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 text-center text-blue-100">
            Validating admin access...
          </div>
        )}

        {adminStatus === 'denied' && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 backdrop-blur-lg p-6 text-center">
            <p className="text-sm font-semibold text-rose-100">Admin access required</p>
            <p className="mt-2 text-xs text-rose-200/80">
              The settings panel is restricted. Switch to the admin access token to manage providers and view usage analytics.
            </p>
          </div>
        )}

        {adminStatus === 'allowed' && (
          <>
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/20 p-2 text-blue-200">
                    <QueueListIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-blue-50">AI Interaction Logs</h2>
                    <p className="text-sm text-blue-200/80">
                      Review recent prompts and completions to debug behaviour or audit usage. Access is controlled by the same token you save in the navigation bar.
                    </p>
                  </div>
                </div>
                <Link href="/logs" className="sm:self-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center gap-2 border border-white/10 bg-white/10 text-blue-50 hover:bg-white/20"
                  >
                    Open Logs
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-blue-50">Usage metrics</h2>
                  <p className="text-sm text-blue-200/80">
                    Inspect how each access token engages with the tools. Totals include the most recent interactions recorded in the AI log.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  {usageUsers.length > 0 && (
                    <select
                      value={selectedUser}
                      onChange={(event) => setSelectedUser(event.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                    >
                      {usageUsers.map((entry) => (
                        <option key={entry.userIdentifier} value={entry.userIdentifier}>
                          {entry.userIdentifier}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="border border-white/10 bg-white/10 text-blue-50 hover:bg-white/20"
                    onClick={loadUsage}
                    disabled={usageLoading}
                  >
                    {usageLoading ? 'Refreshing…' : 'Refresh'}
                  </Button>
                </div>
              </div>
              {usageError && (
                <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {usageError}
                </div>
              )}
              {!usageError && (
                <div className="mt-4">
                  {usageLoading ? (
                    <p className="text-sm text-blue-200/70">Loading usage metrics…</p>
                  ) : selectedSummary ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                        <h3 className="text-sm font-semibold text-blue-50">Summary</h3>
                        <dl className="mt-3 space-y-2 text-sm text-blue-100">
                          <div className="flex items-center justify-between">
                            <dt>Total interactions</dt>
                            <dd className="font-semibold">{selectedSummary.totalInteractions}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt>Last activity</dt>
                            <dd>
                              {selectedSummary.lastInteraction
                                ? new Date(selectedSummary.lastInteraction).toLocaleString()
                                : '—'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                        <h3 className="text-sm font-semibold text-blue-50">Providers</h3>
                        {Object.keys(selectedSummary.providers).length === 0 ? (
                          <p className="mt-3 text-sm text-blue-200/70">No provider usage recorded.</p>
                        ) : (
                          <ul className="mt-3 space-y-1 text-sm text-blue-100">
                            {Object.entries(selectedSummary.providers)
                              .sort((a, b) => b[1] - a[1])
                              .map(([providerId, count]) => (
                                <li key={providerId} className="flex justify-between">
                                  <span>{providerId}</span>
                                  <span className="font-semibold">{count}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                        {Object.keys(selectedSummary.models).length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-200/60">Models</h4>
                            <ul className="mt-2 space-y-1 text-sm text-blue-100">
                              {Object.entries(selectedSummary.models)
                                .sort((a, b) => b[1] - a[1])
                                .map(([modelId, count]) => (
                                  <li key={modelId} className="flex justify-between">
                                    <span>{modelId}</span>
                                    <span className="font-semibold">{count}</span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                        <h3 className="text-sm font-semibold text-blue-50">Activity by type</h3>
                        {Object.keys(selectedSummary.byType).length === 0 ? (
                          <p className="mt-3 text-sm text-blue-200/70">No activity recorded yet.</p>
                        ) : (
                          <ul className="mt-3 space-y-1 text-sm text-blue-100">
                            {Object.entries(selectedSummary.byType)
                              .sort((a, b) => b[1] - a[1])
                              .map(([type, count]) => (
                                <li key={type} className="flex justify-between">
                                  <span>{type}</span>
                                  <span className="font-semibold">{count}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                        <h3 className="text-sm font-semibold text-blue-50">Priority modes</h3>
                        {Object.keys(selectedSummary.byPriority).length === 0 ? (
                          <p className="mt-3 text-sm text-blue-200/70">No priority data recorded.</p>
                        ) : (
                          <ul className="mt-3 space-y-1 text-sm text-blue-100">
                            {Object.entries(selectedSummary.byPriority)
                              .sort((a, b) => b[1] - a[1])
                              .map(([priority, count]) => (
                                <li key={priority} className="flex justify-between">
                                  <span>{priority}</span>
                                  <span className="font-semibold">{count}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-blue-200/70">No interactions recorded for this token.</p>
                  )}
                </div>
              )}
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
          </>
        )}
      </div>
    </div>
  );
}
