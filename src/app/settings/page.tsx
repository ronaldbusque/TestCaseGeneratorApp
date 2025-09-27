'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { Button } from '@/components/ui/Button';

const DOMAIN_LABELS = {
  testCases: 'Test Case Generator',
  sql: 'SQL Assistant',
  data: 'Test Data Generator',
} as const;

export default function SettingsPage() {
  const { settings, availableProviders, updateSetting, resetSettings, loading } = useProviderSettings();

  const providerOptions = useMemo(() => (
    availableProviders.map((provider) => ({
      value: provider.id,
      label: provider.label,
      description: provider.description,
    }))
  ), [availableProviders]);

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
            (Object.entries(DOMAIN_LABELS) as Array<[keyof typeof DOMAIN_LABELS, string]>).map(([domain, label]) => (
              <motion.div
                key={domain}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-blue-50">{label}</h2>
                    <p className="text-sm text-blue-200/80">
                      Select which provider should respond to {label.toLowerCase()} requests.
                    </p>
                  </div>
                  <select
                    value={settings[domain]}
                    onChange={(event) => updateSetting(domain, event.target.value as typeof settings[typeof domain])}
                    className="bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
                  >
                    {providerOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-blue-50">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {providerOptions
                  .find((option) => option.value === settings[domain])
                  ?.description && (
                    <p className="mt-3 text-xs text-blue-200/70">
                      {providerOptions.find((option) => option.value === settings[domain])?.description}
                    </p>
                )}
              </motion.div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-blue-200/70">
            Resetting reverts to OpenAI Agents for all tools.
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
