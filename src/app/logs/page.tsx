'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { fetchApi } from '@/lib/utils/apiClient';

interface LogEntry {
  timestamp: string;
  provider: string;
  model: string | null;
  prompt: string;
  response: string;
  context?: Record<string, unknown>;
}

export default function LogsPage() {
  const { availableProviders } = useProviderSettings();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [providerFilter, setProviderFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  const providerOptions = useMemo(
    () => availableProviders.map((provider) => ({
      value: provider.id,
      label: provider.label,
      models: provider.models ?? [],
    })),
    [availableProviders]
  );

  const selectedProviderModels = useMemo(() => {
    if (!providerFilter) {
      return [];
    }
    return providerOptions.find((option) => option.value === providerFilter)?.models ?? [];
  }, [providerFilter, providerOptions]);

  useEffect(() => {
    setModelFilter('');
  }, [providerFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (providerFilter) {
      params.set('provider', providerFilter);
    }
    if (modelFilter) {
      params.set('model', modelFilter);
    }
    params.set('limit', String(limit));

    try {
      const data = await fetchApi<{ entries: LogEntry[] }>(`/api/logs/ai?${params.toString()}`);
      setEntries(data.entries ?? []);
      setLastRefreshed(new Date().toISOString());
    } catch (err: any) {
      const message = err?.message ?? 'Failed to load logs.';
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [providerFilter, modelFilter, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    const id = setInterval(() => {
      fetchLogs();
    }, 20000);

    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastRefreshed) {
      return 'never';
    }
    return new Date(lastRefreshed).toLocaleTimeString();
  }, [lastRefreshed]);

  return (
    <div className="relative py-12">
      <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200"
          >
            AI Interaction Logs
          </motion.h1>
          <p className="text-blue-100 max-w-2xl mx-auto">
            Inspect recent prompts and completions without leaving the browser. Use the filters to narrow down a specific provider and model when debugging latency or usage limits.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto">
              <label className="flex flex-col text-sm text-blue-100/80">
                Provider
                <select
                  value={providerFilter}
                  onChange={(event) => setProviderFilter(event.target.value)}
                  className="mt-1 bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                >
                  <option value="">All providers</option>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col text-sm text-blue-100/80">
                Model
                <select
                  value={modelFilter}
                  onChange={(event) => setModelFilter(event.target.value)}
                  disabled={!selectedProviderModels.length && !providerFilter}
                  className="mt-1 bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm disabled:opacity-50"
                >
                  <option value="">All models</option>
                  {(selectedProviderModels.length ? selectedProviderModels : providerOptions.flatMap((option) => option.models)).map((model) => (
                    <option key={`${model.id}`} value={model.id}>
                      {model.label ?? model.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col text-sm text-blue-100/80">
                Entries
                <select
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="mt-1 bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                >
                  {[20, 50, 100, 150].map((value) => (
                    <option key={value} value={value}>
                      Last {value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-blue-100/80">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                  className="h-4 w-4 rounded border border-white/20 bg-slate-900 text-blue-400 focus:ring-blue-500"
                />
                Auto refresh
              </label>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-xs text-blue-200/60">
                Last updated {lastUpdatedLabel}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="border border-white/10 bg-white/10 text-blue-50 hover:bg-white/20 flex items-center gap-2"
                onClick={fetchLogs}
                disabled={loading}
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {loading && !entries.length ? (
              <div className="text-center text-blue-200">Loading recent activity...</div>
            ) : entries.length === 0 ? (
              <div className="text-center text-blue-200/70 border border-dashed border-white/20 rounded-xl py-12">
                No interactions recorded for the selected filters yet.
              </div>
            ) : (
              entries.map((entry, index) => {
                const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
                return (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="rounded-xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-md"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-blue-100 font-semibold">
                          {entry.provider.toUpperCase()} · {entry.model ?? 'default model'}
                        </p>
                        {timestamp && (
                          <p className="text-xs text-blue-200/60">
                            {timestamp.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-blue-200/50">
                        {entry.context && Object.keys(entry.context).length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-blue-300">View context</summary>
                            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950/70 p-3 text-[0.7rem] text-blue-100">
                              {JSON.stringify(entry.context, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-blue-200/50 mb-2">Prompt</p>
                        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950/70 p-3 text-sm text-blue-100 whitespace-pre-wrap">
                          {entry.prompt}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-blue-200/50 mb-2">Response</p>
                        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950/70 p-3 text-sm text-blue-100 whitespace-pre-wrap">
                          {entry.response}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
