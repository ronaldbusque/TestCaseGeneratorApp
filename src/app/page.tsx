'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FileUpload } from '../components/FileUpload';
import { RequirementsInput } from '@/components/RequirementsInput';
import { TestCaseList } from '@/components/TestCaseList';
import { TestCase, TestCaseMode, HighLevelTestCase, TestPriorityMode, UploadedFilePayload, FileTokenSummary, GenerationPlanItem, ReviewFeedbackItem, AgenticTelemetry, TestCaseGenerationResponse, AgenticProgressEvent } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { TestCaseModeToggle } from '@/components/TestCaseModeToggle';
import { NetworkBackground } from '@/components/NetworkBackground';
import { TestPriorityToggle } from '@/components/TestPriorityToggle';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { NavigationBar } from '@/components/NavigationBar';
import { fetchApi, fetchApiStream } from '@/lib/utils/apiClient';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { QuickModelSwitcher } from '@/components/QuickModelSwitcher';
import type { LLMProvider } from '@/lib/types/providers';

const isHighLevelTestCase = (testCase: TestCase): testCase is HighLevelTestCase => {
  return 'scenario' in testCase && 'area' in testCase;
};

const MAX_FILE_CONTENT_LENGTH = 8000;
const MAX_FILE_PREVIEW_LENGTH = 500;

export default function Home() {
  const { settings, availableProviders, quickSelections } = useProviderSettings();
  const [testCaseMode, setTestCaseMode] = useState<TestCaseMode>('high-level');
  const [testPriorityMode, setTestPriorityMode] = useState<TestPriorityMode>('comprehensive');
  const [requirements, setRequirements] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [highLevelTestCases, setHighLevelTestCases] = useState<TestCase[]>([]);
  const [detailedTestCases, setDetailedTestCases] = useState<TestCase[]>([]);
  const [convertedTestCases, setConvertedTestCases] = useState<TestCase[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [convertedScenarioIds, setConvertedScenarioIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<
    'idle'
    | 'analyzing'
    | 'planning'
    | 'generating'
    | 'reviewing'
    | 'finalizing'
    | 'complete'
  >('idle');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [preparedFilePayloads, setPreparedFilePayloads] = useState<UploadedFilePayload[]>([]);
  const [fileTokenSummary, setFileTokenSummary] = useState<FileTokenSummary | null>(null);
  const [fileTokenStatus, setFileTokenStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [fileTokenError, setFileTokenError] = useState<string | null>(null);
  const [isFileContentVisible, setIsFileContentVisible] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmationType, setConfirmationType] = useState<'new_session' | null>(null);
  const [shouldResetFiles, setShouldResetFiles] = useState(false);
  const [agenticEnabled, setAgenticEnabled] = useState(false);
  const [reviewPasses, setReviewPasses] = useState(1);
  const [plannerModelOverride, setPlannerModelOverride] = useState('');
  const [writerModelOverride, setWriterModelOverride] = useState('');
  const [reviewerProviderOverride, setReviewerProviderOverride] = useState<'same' | LLMProvider>('same');
  const [reviewerModelOverride, setReviewerModelOverride] = useState('');
  const [writerConcurrency, setWriterConcurrency] = useState(1);
  const [generationPlan, setGenerationPlan] = useState<GenerationPlanItem[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState<ReviewFeedbackItem[]>([]);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [generationTelemetry, setGenerationTelemetry] = useState<AgenticTelemetry | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [plannerProgress, setPlannerProgress] = useState({ started: false, completed: false, planItems: 0 });
  const [writerProgress, setWriterProgress] = useState({
    started: false,
    completedSlices: 0,
    totalSlices: 0,
    totalCases: 0,
    concurrency: 1,
  });
  const [reviewProgress, setReviewProgress] = useState({
    started: false,
    maxPasses: 0,
    completedPasses: 0,
    blockingPassRuns: 0,
  });
  const [revisionProgress, setRevisionProgress] = useState({ runs: 0, lastUpdatedCases: 0 });
  const progressRef = useRef<HTMLDivElement | null>(null);

  const reviewerProviderOptions = useMemo(
    () => [
      { value: 'same' as const, label: 'Same as generator' },
      ...availableProviders.map((provider) => ({
        value: provider.id,
        label: provider.label,
      })),
    ],
    [availableProviders]
  );

  const plannerModelOptions = useMemo(() => {
    const options: { model: string; label: string }[] = [];
    const seen = new Set<string>();
    const addOption = (model: string, label?: string) => {
      if (!model || seen.has(model)) return;
      options.push({ model, label: label ?? model });
      seen.add(model);
    };

    addOption(settings.testCases.model, settings.testCases.model);
    quickSelections
      .filter((qs) => qs.provider === settings.testCases.provider)
      .forEach((qs) => addOption(qs.model, qs.label ?? qs.model));

    return options;
  }, [quickSelections, settings.testCases.model, settings.testCases.provider]);

  const writerModelOptions = useMemo(() => {
    const options: { model: string; label: string }[] = [];
    const seen = new Set<string>();
    const addOption = (model: string, label?: string) => {
      if (!model || seen.has(model)) return;
      options.push({ model, label: label ?? model });
      seen.add(model);
    };

    addOption(settings.testCases.model, settings.testCases.model);
    quickSelections
      .filter((qs) => qs.provider === settings.testCases.provider)
      .forEach((qs) => addOption(qs.model, qs.label ?? qs.model));

    return options;
  }, [quickSelections, settings.testCases.model, settings.testCases.provider]);

  const reviewerProviderResolved: LLMProvider = reviewerProviderOverride === 'same'
    ? settings.testCases.provider
    : reviewerProviderOverride;

  const reviewerDefaultModel = useMemo(() => {
    if (reviewerProviderOverride === 'same') {
      return settings.testCases.model;
    }
    const descriptor = availableProviders.find((provider) => provider.id === reviewerProviderResolved);
    return descriptor?.defaultModel ?? descriptor?.models?.[0]?.id ?? settings.testCases.model;
  }, [availableProviders, reviewerProviderOverride, reviewerProviderResolved, settings.testCases.model]);

  const reviewerModelOptions = useMemo(() => {
    const options: { model: string; label: string }[] = [];
    const seen = new Set<string>();
    const addOption = (model: string | undefined, label?: string) => {
      if (!model || seen.has(model)) return;
      options.push({ model, label: label ?? model });
      seen.add(model);
    };

    addOption(reviewerDefaultModel, reviewerDefaultModel);
    quickSelections
      .filter((qs) => qs.provider === reviewerProviderResolved)
      .forEach((qs) => addOption(qs.model, qs.label ?? qs.model));

    return options;
  }, [quickSelections, reviewerDefaultModel, reviewerProviderResolved]);

  const generationStepMessages = useMemo(() => ({
    idle: 'Idle',
    analyzing: 'Analyzing uploaded materials and estimating token usage',
    planning: 'Planning coverage with QA best practices',
    generating: agenticEnabled
      ? 'Expanding each coverage area into test cases'
      : 'Generating test cases',
    reviewing: 'Reviewer evaluating coverage and identifying gaps',
    finalizing: 'Finalizing results and telemetry',
    complete: 'Generation complete',
  }), [agenticEnabled]);

  const loadingMessage = generationStepMessages[generationStep] ?? generationStep;

  const progressDescription = useMemo(() => {
    switch (generationStep) {
      case 'analyzing':
        return 'Parsing uploaded documents and estimating how much context will be needed.';
      case 'planning':
        return 'Drafting a coverage blueprint that aligns with the selected priority mode.';
      case 'generating':
        return agenticEnabled
          ? 'Authoring test cases for each planned coverage slice.'
          : 'Authoring the requested test cases based on the supplied requirements.';
      case 'reviewing':
        return 'Reviewer agent is assessing coverage and flagging any gaps or issues.';
      case 'finalizing':
        return 'Applying final formatting, compiling telemetry, and preparing the response.';
      case 'complete':
        return 'Review the generated outcome and expand optional details below as needed.';
      default:
        return '';
    }
  }, [generationStep, agenticEnabled]);

  const shouldRenderProgressCard = generationStep !== 'idle' || Boolean(generationTelemetry);
  useEffect(() => {
    if (shouldRenderProgressCard && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shouldRenderProgressCard, generationStep]);

  const severityStyles: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-100 border-blue-500/30',
    minor: 'bg-amber-500/20 text-amber-100 border-amber-500/30',
    major: 'bg-orange-500/20 text-orange-100 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-100 border-red-500/30',
  };

  const formatDuration = (ms?: number) => {
    if (typeof ms !== 'number' || Number.isNaN(ms)) {
      return '—';
    }
    if (ms < 1000) {
      return `${Math.round(ms)} ms`;
    }
    return `${(ms / 1000).toFixed(1)} s`;
  };

  const stageRows = useMemo(() => {
    const rows: Array<{ key: string; label: string; status: string; completed?: number; total?: number; remaining?: number }> = [];

    const planTotal = Math.max(
      generationPlan.length,
      generationTelemetry?.planItemCount ?? 0,
      plannerProgress.planItems ?? 0,
    );

    const plannerStatus = (() => {
      if (plannerProgress.started && !plannerProgress.completed) return 'In progress';
      if (plannerProgress.completed || ['generating', 'reviewing', 'finalizing', 'complete'].includes(generationStep) || generationTelemetry) {
        return 'Complete';
      }
      if (generationStep === 'planning' || generationStep === 'analyzing') return 'In progress';
      return 'Pending';
    })();

    rows.push({
      key: 'planning',
      label: 'Planning',
      status: plannerStatus,
      completed: plannerProgress.completed ? planTotal : undefined,
      total: planTotal > 0 || plannerProgress.completed ? planTotal : undefined,
      remaining: plannerProgress.completed ? 0 : planTotal > 0 ? planTotal : undefined,
    });

    const writerTotal = Math.max(
      planTotal,
      writerProgress.totalSlices || 0,
      generationTelemetry?.writerSlices?.length ?? 0,
    );

    const writerCompletedCount = generationTelemetry?.writerSlices?.length ?? (writerProgress.started ? writerProgress.completedSlices : undefined);

    const writerStatus = (() => {
      if (writerProgress.started && (writerCompletedCount ?? 0) < (writerTotal || 0)) return 'In progress';
      if (
        ['reviewing', 'finalizing', 'complete'].includes(generationStep) ||
        (writerTotal > 0 && (writerCompletedCount ?? 0) >= writerTotal)
      ) {
        return 'Complete';
      }
      if (plannerProgress.completed || generationStep === 'generating') return 'In progress';
      return 'Pending';
    })();

    rows.push({
      key: 'writer',
      label: 'Writer slices',
      status: writerStatus,
      completed: writerCompletedCount ?? undefined,
      total: writerTotal || undefined,
      remaining: writerTotal
        ? Math.max(writerTotal - (writerCompletedCount ?? 0), 0)
        : undefined,
    });

    const executedReviewPasses = generationTelemetry?.reviewPasses?.length ?? reviewProgress.completedPasses ?? 0;

    const expectedReviewPasses = Math.max(
      reviewPasses,
      reviewProgress.maxPasses,
      executedReviewPasses,
    );

    const reviewStatus = (() => {
      if (expectedReviewPasses === 0 && executedReviewPasses === 0) return 'Skipped';
      if (reviewProgress.started && executedReviewPasses < expectedReviewPasses) return 'In progress';
      if (
        executedReviewPasses >= expectedReviewPasses ||
        ['finalizing', 'complete'].includes(generationStep)
      ) {
        return 'Complete';
      }
      if (writerProgress.started) return 'Pending';
      return 'Pending';
    })();

    rows.push({
      key: 'review',
      label: 'Reviewer passes',
      status: reviewStatus,
      completed: executedReviewPasses || undefined,
      total: expectedReviewPasses || undefined,
      remaining: expectedReviewPasses ? Math.max(expectedReviewPasses - executedReviewPasses, 0) : undefined,
    });

    const revisionRunsTelemetry = generationTelemetry?.reviewPasses?.filter((pass) => pass.blockingCount > 0).length ?? null;
    const revisionCompleted = revisionRunsTelemetry ?? revisionProgress.runs ?? 0;
    const revisionTotal = Math.max(
      revisionRunsTelemetry ?? 0,
      reviewProgress.blockingPassRuns,
      revisionProgress.runs,
    );

    const revisionStatus = (() => {
      if (expectedReviewPasses === 0) return 'Skipped';
      if (revisionCompleted > 0 && revisionCompleted >= revisionTotal) return 'Complete';
      if (reviewProgress.blockingPassRuns > revisionCompleted) return 'In progress';
      if (generationStep === 'reviewing') return 'Pending';
      if (['finalizing', 'complete'].includes(generationStep)) {
        return revisionCompleted > 0 ? 'Complete' : 'Skipped';
      }
      return 'Pending';
    })();

    rows.push({
      key: 'revision',
      label: 'Revision runs',
      status: revisionStatus,
      completed: revisionCompleted || undefined,
      total: revisionTotal || undefined,
      remaining: revisionTotal ? Math.max(revisionTotal - revisionCompleted, 0) : undefined,
    });

    return rows;
  }, [
    generationPlan.length,
    generationTelemetry,
    generationStep,
    plannerProgress,
    writerProgress,
    reviewProgress,
    revisionProgress,
    reviewPasses,
  ]);

  const statusDotClasses: Record<string, string> = {
    'In progress': 'bg-amber-400',
    Complete: 'bg-green-400',
    Pending: 'bg-blue-400/60',
    Skipped: 'bg-blue-200/60',
  };

  const statusTextClasses: Record<string, string> = {
    'In progress': 'text-amber-300',
    Complete: 'text-green-300',
    Pending: 'text-blue-200/70',
    Skipped: 'text-blue-200/50',
  };

  const ProgressCard = ({ showSpinner }: { showSpinner: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
        <div>
          <p className="text-sm font-semibold text-blue-50">
            {generationStep === 'complete' ? 'Generation complete' : loadingMessage}
          </p>
          {progressDescription && (
            <p className="text-xs text-blue-200/80 mt-1">{progressDescription}</p>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-blue-100">
        {stageRows.map((row) => (
          <li key={row.key} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClasses[row.status] ?? 'bg-blue-200/60'}`}></span>
              <span>{row.label}</span>
              <span className={`text-xs ${statusTextClasses[row.status] ?? 'text-blue-200/70'}`}>{row.status}</span>
            </span>
            <span className="text-xs text-blue-200/80">
              {row.total !== undefined
                ? `${row.completed ?? 0}/${row.total}${row.remaining !== undefined ? ` (${row.remaining} remaining)` : ''}`
                : row.completed ?? '—'}
            </span>
          </li>
        ))}
      </ul>

      {showSpinner && (
        <div className="mt-4">
          <LoadingAnimation message={`${loadingMessage}...`} />
        </div>
      )}
    </motion.div>
  );

  // Add effect to clear fileContent when no files are present
  useEffect(() => {
    if (uploadedFiles.length === 0) {
      setFileContent('');
    }
  }, [uploadedFiles]);

  // Helper to get current test cases based on mode
  const getCurrentTestCases = () => testCaseMode === 'high-level' ? highLevelTestCases : detailedTestCases;
  const setCurrentTestCases = (testCases: TestCase[]) => {
    if (testCaseMode === 'high-level') {
      setHighLevelTestCases(testCases);
    } else {
      setDetailedTestCases(testCases);
    }
  };

  const clearSession = () => {
    setRequirements('');
    setFileContent('');
    setHighLevelTestCases([]);
    setDetailedTestCases([]);
    setConvertedTestCases([]);
    setSelectedTestCases(new Set());
    setConvertedScenarioIds(new Set());
    setError(null);
    setUploadedFiles([]);
    setPreparedFilePayloads([]);
    setFileTokenSummary(null);
    setFileTokenStatus('idle');
    setFileTokenError(null);
    setIsFileContentVisible(false);
    setGenerationStep('idle');
    setShouldResetFiles(true);
    setGenerationPlan([]);
    setReviewFeedback([]);
    setGenerationWarnings([]);
    setGenerationTelemetry(null);
    setShowPlanDetails(false);
    setShowTelemetryDetails(false);
    setShowReviewDetails(false);
  };

  const handleNewSession = () => {
    setConfirmationType('new_session');
    setIsConfirmDialogOpen(true);
  };

  const getConfirmationDetails = () => {
    return {
      title: "Start New Session",
      message: "This will clear all current files, requirements, and generated test cases. Are you sure you want to start fresh?",
      confirmLabel: "Clear & Start New",
    };
  };

  const hasExistingData = () => {
    return uploadedFiles.length > 0 || requirements.trim() !== '' || getCurrentTestCases().length > 0;
  };

  const extractReadableContent = async (file: File): Promise<string> => {
    try {
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        return await file.text();
      }

      if (file.type === 'application/pdf' || file.type.includes('wordprocessingml') || file.type.includes('msword')) {
        return '[Binary document uploaded. The multimodal model should interpret the original file directly.]';
      }

      if (file.type.startsWith('image/')) {
        return '[Image uploaded for visual analysis.]';
      }

      return `[${file.type || 'Unknown file type'} uploaded.]`;
    } catch (error) {
      console.error('File read error:', error);
      return '';
    }
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (typeof result === 'string') {
          const base64 = result.includes('base64,') ? result.split('base64,')[1] : result;
          resolve(base64);
        } else {
          reject(new Error('Unsupported file encoding'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const buildFilePayloads = async (files: File[]): Promise<UploadedFilePayload[]> => {
    const payloads = await Promise.all(
      files.map(async (file) => {
        const content = await extractReadableContent(file);
        const trimmed = content.length > MAX_FILE_CONTENT_LENGTH
          ? `${content.slice(0, MAX_FILE_CONTENT_LENGTH)}...`
          : content;

        let base64Data: string | undefined;
        try {
          base64Data = await fileToBase64(file);
        } catch (error) {
          console.warn('Failed to convert file to base64', { file: file.name, error });
        }

        return {
          name: file.name,
          type: file.type,
          preview: trimmed,
          data: base64Data,
          size: file.size,
        };
      })
    );

    return payloads.filter(({ name }) => Boolean(name));
  };

  const buildAgenticOptions = useCallback(() => {
    if (!agenticEnabled) {
      return undefined;
    }

    const writerProvider = settings.testCases.provider;
    const writerModel = writerModelOverride.trim() || settings.testCases.model;
    const plannerModel = plannerModelOverride.trim() || settings.testCases.model;
    const reviewerModel = reviewerModelOverride.trim() || reviewerDefaultModel;

    const reviewerProvider = reviewerProviderOverride === 'same'
      ? writerProvider
      : reviewerProviderOverride;

    const normalizedPasses = Number.isFinite(reviewPasses)
      ? Math.max(0, Math.min(6, Math.floor(reviewPasses)))
      : 0;

    const normalizedConcurrency = Number.isFinite(writerConcurrency)
      ? Math.max(1, Math.min(6, Math.floor(writerConcurrency)))
      : 1;

    return {
      enableAgentic: true,
      plannerProvider: writerProvider,
      plannerModel,
      writerProvider,
      writerModel,
      reviewerProvider,
      reviewerModel,
      maxReviewPasses: normalizedPasses,
      chunkStrategy: 'auto',
      writerConcurrency: normalizedConcurrency,
      streamProgress: true,
    } as const;
  }, [agenticEnabled, plannerModelOverride, reviewerModelOverride, writerModelOverride, reviewerDefaultModel, reviewerProviderOverride, reviewPasses, writerConcurrency, settings.testCases.model, settings.testCases.provider]);

  const fetchFileTokenSummary = useCallback(async (
    payloads: UploadedFilePayload[],
    currentRequirements: string
  ): Promise<FileTokenSummary | null> => {
    if (!payloads.length) {
      return null;
    }

    return fetchApi<FileTokenSummary>('/api/files/analyze', {
      method: 'POST',
      body: JSON.stringify({
        files: payloads,
        provider: settings.testCases.provider,
        model: settings.testCases.model,
        requirements: currentRequirements,
      }),
    });
  }, [settings.testCases.model, settings.testCases.provider]);

  useEffect(() => {
    if (!preparedFilePayloads.length) {
      setFileTokenSummary(null);
      setFileTokenStatus('idle');
      setFileTokenError(null);
      return;
    }

    let cancelled = false;
    setFileTokenStatus('loading');
    setFileTokenError(null);

    const timeoutId = setTimeout(() => {
      fetchFileTokenSummary(preparedFilePayloads, requirements)
        .then((summary) => {
          if (cancelled) {
            return;
          }
          setFileTokenSummary(summary ?? null);
          setFileTokenStatus('ready');
        })
        .catch((err) => {
          if (cancelled) {
            return;
          }
          const message = err instanceof Error ? err.message : 'Failed to estimate tokens';
          setFileTokenError(message);
          setFileTokenStatus('error');
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [preparedFilePayloads, requirements, fetchFileTokenSummary]);

  const handleFilesSelect = async (files: File[]) => {
    setShouldResetFiles(false);
    setUploadedFiles(files);

    if (files.length === 0) {
      setPreparedFilePayloads([]);
      setFileContent('');
      setFileTokenSummary(null);
      setFileTokenStatus('idle');
      setFileTokenError(null);
      setGenerationStep('idle');
      return;
    }

    try {
      setGenerationStep('analyzing');
      const payloads = await buildFilePayloads(files);
      setPreparedFilePayloads(payloads);

      const summary = payloads
        .map(({ name, type, preview }) => {
          if (!preview) {
            return `• ${name} (${type || 'unknown'})`;
          }
          const truncatedPreview = preview.slice(0, MAX_FILE_PREVIEW_LENGTH);
          const needsEllipsis = preview.length > MAX_FILE_PREVIEW_LENGTH;
          return `=== ${name} (${type || 'unknown'}) ===\n${truncatedPreview}${needsEllipsis ? '...' : ''}`;
        })
        .join('\n\n');

      setFileContent(summary || `Uploaded files:\n${files.map(file => `• ${file.name}`).join('\n')}`);
    } catch (error) {
      console.error('File processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process files');
    } finally {
      setGenerationStep('idle');
    }
  };

  const generateTestCases = async (manualRequirements: string) => {
    try {
      setError(null);
      setIsGenerating(true);
      setGenerationWarnings([]);
      setGenerationPlan([]);
      setReviewFeedback([]);
      setGenerationTelemetry(null);
      setShowPlanDetails(false);
      setShowTelemetryDetails(false);
      setShowReviewDetails(false);

      if (testCaseMode === 'high-level') {
        setConvertedTestCases([]);
        setConvertedScenarioIds(new Set());
      }

      const agenticOptions = buildAgenticOptions();
      const shouldStream = Boolean(agenticOptions?.streamProgress);
      const normalizedPasses = agenticOptions?.maxReviewPasses ?? 0;
      const initialConcurrency = agenticOptions?.writerConcurrency ?? 1;

      setPlannerProgress({ started: false, completed: false, planItems: 0 });
      setWriterProgress({
        started: false,
        completedSlices: 0,
        totalSlices: 0,
        totalCases: 0,
        concurrency: initialConcurrency,
      });
      setReviewProgress({
        started: false,
        maxPasses: normalizedPasses,
        completedPasses: 0,
        blockingPassRuns: 0,
      });
      setRevisionProgress({ runs: 0, lastUpdatedCases: 0 });

      if (agenticEnabled) {
        setGenerationStep('planning');
        if (!shouldStream) {
          setTimeout(() => {
            setGenerationStep((prev) => (prev === 'planning' ? 'generating' : prev));
          }, 150);
        }
      } else {
        setGenerationStep('generating');
      }

      const filePayloads = preparedFilePayloads.length === uploadedFiles.length
        ? preparedFilePayloads
        : await buildFilePayloads(uploadedFiles);

      console.log(`[Client] Calling test case generation API - Mode: ${testCaseMode}`);

      const requestPayload = {
        requirements: manualRequirements,
        fileContent,
        mode: testCaseMode,
        priorityMode: testPriorityMode,
        files: filePayloads,
        provider: settings.testCases.provider,
        model: settings.testCases.model,
        agenticOptions,
      };

      const requestInit: RequestInit = {
        method: 'POST',
        body: JSON.stringify(requestPayload),
      };

      const applyFinalResult = (result: TestCaseGenerationResponse) => {
        if (result.error) {
          throw new Error(result.error);
        }

        if (result.plan) {
          setPlannerProgress({ started: true, completed: true, planItems: result.plan.length });
        }

        if (result.telemetry?.writerSlices) {
          const completedSlices = result.telemetry.writerSlices.length;
          setWriterProgress((prev) => ({
            started: true,
            completedSlices: Math.max(prev.completedSlices, completedSlices),
            totalSlices: Math.max(prev.totalSlices, completedSlices),
            totalCases: result.telemetry?.testCaseCount ?? prev.totalCases,
            concurrency: result.telemetry?.writerConcurrency ?? prev.concurrency,
          }));
        }

        if (result.telemetry?.reviewPasses) {
          const reviewPassCount = result.telemetry.reviewPasses.length;
          const blockingRuns = result.telemetry.reviewPasses.filter((pass) => pass.blockingCount > 0).length;
          setReviewProgress((prev) => ({
            started: reviewPassCount > 0 || prev.started,
            maxPasses: Math.max(prev.maxPasses, reviewPassCount, normalizedPasses),
            completedPasses: Math.max(prev.completedPasses, reviewPassCount),
            blockingPassRuns: Math.max(prev.blockingPassRuns, blockingRuns),
          }));
          setRevisionProgress((prev) => ({
            runs: Math.max(prev.runs, blockingRuns),
            lastUpdatedCases: prev.lastUpdatedCases,
          }));
        }

        if (agenticOptions?.enableAgentic && (result.passesExecuted ?? 0) > 0) {
          setGenerationStep('reviewing');
        }

        setCurrentTestCases(result.testCases ?? []);
        setGenerationPlan(result.plan ?? []);
        setReviewFeedback(result.reviewFeedback ?? []);
        setGenerationWarnings(result.warnings ?? []);
        setGenerationTelemetry(result.telemetry ?? null);
        setShowPlanDetails(false);
        setShowTelemetryDetails(false);
        setShowReviewDetails(false);

        setGenerationStep('finalizing');
        setGenerationStep('complete');
      };

      const parseProgressEvent = (event: AgenticProgressEvent) => {
        switch (event.type) {
          case 'planner:start':
            setPlannerProgress({ started: true, completed: false, planItems: 0 });
            break;
          case 'planner:complete':
            setPlannerProgress({ started: true, completed: true, planItems: event.planItems ?? 0 });
            break;
          case 'writer:start':
            setWriterProgress({
              started: true,
              completedSlices: 0,
              totalSlices: event.totalSlices ?? 0,
              totalCases: 0,
              concurrency: event.concurrency ?? initialConcurrency,
            });
            setGenerationStep('generating');
            break;
          case 'writer:slice-start':
            setWriterProgress((prev) => ({
              ...prev,
              started: true,
              totalSlices: event.totalSlices ?? prev.totalSlices,
            }));
            break;
          case 'writer:slice-complete':
            setWriterProgress((prev) => {
              const reportedTotal = event.totalSlices ?? prev.totalSlices;
              const inferredTotal = reportedTotal || Math.max(prev.totalSlices, prev.completedSlices + 1);
              const completed = Math.min(prev.completedSlices + 1, inferredTotal);
              return {
                ...prev,
                started: true,
                totalSlices: inferredTotal,
                completedSlices: completed,
                totalCases: prev.totalCases + (event.cases ?? 0),
              };
            });
            break;
          case 'writer:complete':
            setWriterProgress((prev) => ({
              ...prev,
              started: true,
              totalSlices: event.totalSlices ?? prev.totalSlices,
              completedSlices: event.totalSlices ?? prev.totalSlices ?? prev.completedSlices,
              totalCases: event.totalCases ?? prev.totalCases,
            }));
            break;
          case 'review:pass-start':
            setReviewProgress((prev) => ({
              started: true,
              maxPasses: Math.max(prev.maxPasses, event.maxPasses ?? prev.maxPasses, normalizedPasses),
              completedPasses: prev.completedPasses,
              blockingPassRuns: prev.blockingPassRuns,
            }));
            setGenerationStep('reviewing');
            break;
          case 'review:pass-complete':
            setReviewProgress((prev) => ({
              started: true,
              maxPasses: Math.max(prev.maxPasses, event.maxPasses ?? prev.maxPasses, normalizedPasses),
              completedPasses: Math.max(prev.completedPasses + 1, event.pass ?? prev.completedPasses + 1),
              blockingPassRuns: prev.blockingPassRuns + (event.blockingCount > 0 ? 1 : 0),
            }));
            break;
          case 'revision:start':
            setRevisionProgress((prev) => ({
              runs: prev.runs,
              lastUpdatedCases: prev.lastUpdatedCases,
            }));
            break;
          case 'revision:complete':
            setRevisionProgress((prev) => ({
              runs: prev.runs + 1,
              lastUpdatedCases: event.updatedCases ?? prev.lastUpdatedCases,
            }));
            break;
          default:
            break;
        }
      };

      const streamProgress = async () => {
        const response = await fetchApiStream('/api/generate', requestInit);
        const contentType = response.headers.get('Content-Type') ?? '';

        if (!contentType.includes('application/x-ndjson') || !response.body) {
          const fallback = await response.json();
          applyFinalResult(fallback);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalReceived = false;
        let streamError: Error | null = null;
        let shouldStop = false;

        const processBuffer = () => {
          while (!shouldStop) {
            const newlineIndex = buffer.indexOf('\n');
            if (newlineIndex === -1) {
              break;
            }
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (!line) {
              continue;
            }
            try {
              const event = JSON.parse(line) as AgenticProgressEvent;
              if (event.type === 'error') {
                streamError = new Error(event.message || 'Streaming error');
                shouldStop = true;
                return;
              }
              if (event.type === 'final') {
                applyFinalResult(event.result);
                finalReceived = true;
                shouldStop = true;
                return;
              }
              parseProgressEvent(event);
            } catch (parseError) {
              console.warn('Failed to parse progress event', parseError);
            }
          }
        };

        try {
          while (!shouldStop) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            processBuffer();
          }
          if (!shouldStop) {
            buffer += decoder.decode();
            processBuffer();
          }
        } finally {
          reader.releaseLock();
        }

        if (streamError) {
          throw streamError;
        }

        if (!finalReceived) {
          throw new Error('Stream ended before final result was received.');
        }
      };

      if (shouldStream) {
        await streamProgress();
      } else {
        const result = await fetchApi('/api/generate', requestInit);
        applyFinalResult(result);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate test cases');
      setGenerationStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequirementsSubmit = (manualRequirements: string) => {
    setRequirements(manualRequirements);
    generateTestCases(manualRequirements);
  };

  const handleRegenerate = () => {
    generateTestCases(requirements);
  };

  const handleTestCaseUpdate = (updatedTestCases: TestCase[]) => {
    setCurrentTestCases(updatedTestCases);
  };

  const handleSelectTestCase = (id: string, selected: boolean) => {
    // Don't allow selection of already converted scenarios
    if (convertedScenarioIds.has(id)) return;

    setSelectedTestCases(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const getNextTestCaseId = (prefix: string) => {
    // Get all existing IDs from both converted test cases and original test cases
    const allIds = [
      ...convertedTestCases.map(tc => tc.id),
      ...getCurrentTestCases().map(tc => tc.id)
    ];
    
    let maxNumber = 0;
    
    for (const id of allIds) {
      if (typeof id === 'string' && id.startsWith(prefix)) {
        const number = parseInt(id.split('-')[1]);
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }
    }
    
    return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const handleConvertSelected = async () => {
    if (selectedTestCases.size === 0) return;

    setIsGenerating(true);
    setGenerationStep('generating');
    
    try {
      setGenerationWarnings([]);
      setGenerationPlan([]);
      setReviewFeedback([]);
      setGenerationTelemetry(null);

      const agenticOptions = buildAgenticOptions();

      const selectedScenarios = getCurrentTestCases()
        .filter((tc): tc is HighLevelTestCase => 
          isHighLevelTestCase(tc) && selectedTestCases.has(tc.id)
        );
      
      // Call the protected API endpoint instead of using the AI service directly
      console.log(`[Client] Calling test case conversion API - Selected scenarios: ${selectedScenarios.length}`);
      const filePayloads = preparedFilePayloads.length === uploadedFiles.length
        ? preparedFilePayloads
        : await buildFilePayloads(uploadedFiles);
      const result = await fetchApi('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          requirements,
          mode: 'detailed',
          selectedScenarios,
          files: filePayloads,
          provider: settings.testCases.provider,
          model: settings.testCases.model,
          agenticOptions,
        })
      });

      if (result.error) {
        setError(result.error);
      } else if (result.testCases) {
        if (agenticOptions?.enableAgentic && (result.passesExecuted ?? 0) > 0) {
          setGenerationStep('reviewing');
        }

      setGenerationPlan(result.plan ?? []);
      setReviewFeedback(result.reviewFeedback ?? []);
      setGenerationWarnings(result.warnings ?? []);
      setGenerationTelemetry(result.telemetry ?? null);
      setShowPlanDetails(false);
      setShowTelemetryDetails(false);

        const requestedCount = selectedScenarios.length;
        const limitedTestCases = Array.isArray(result.testCases)
          ? result.testCases.slice(0, requestedCount)
          : [];

        if (result.testCases.length > requestedCount) {
          console.warn('[Client] Conversion returned more test cases than requested', {
            requested: requestedCount,
            received: result.testCases.length,
          });
        }

        console.log('[Client] Conversion response summary', {
          requested: requestedCount,
          received: result.testCases.length,
        });

        // Prepare ID generation that avoids collisions deterministically
        const existingIds: Set<string> = new Set([
          ...convertedTestCases.map(tc => tc.id).filter((id): id is string => typeof id === 'string'),
          ...getCurrentTestCases().map(tc => tc.id).filter((id): id is string => typeof id === 'string'),
        ]);

        const nextId = (() => {
          let maxNumber = 0;
          existingIds.forEach((id) => {
            if (id.startsWith('TC-')) {
              const number = parseInt(id.split('-')[1], 10);
              if (!Number.isNaN(number)) {
                maxNumber = Math.max(maxNumber, number);
              }
            }
          });
          return () => {
            maxNumber += 1;
            const newId = `TC-${String(maxNumber).padStart(3, '0')}`;
            existingIds.add(newId);
            return newId;
          };
        })();

        const newTestCases: TestCase[] = limitedTestCases.map((tc: any, index: number) => {
          const originalScenario = selectedScenarios[index];
          return {
            ...tc,
            id: nextId(),
            area: originalScenario?.area || tc.area || 'General',
            originalScenarioId: originalScenario?.id
          };
        });

        setConvertedTestCases(prev => [...prev, ...newTestCases]);
        
        // Mark these scenarios as converted
        setConvertedScenarioIds(prev => {
          const newSet = new Set(prev);
          selectedScenarios.forEach(scenario => newSet.add(scenario.id));
          return newSet;
        });
      }
      setGenerationStep('finalizing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert test scenarios');
    } finally {
      setIsGenerating(false);
      setGenerationStep('complete');
      setSelectedTestCases(new Set());
    }
  };

  const handleExportCSV = (testCases: TestCase[]) => {
    // Implementation of handleExportCSV function
  };

  const handleExportXLSX = (testCases: TestCase[]) => {
    // Implementation of handleExportXLSX function
  };

  const handleExportDOCX = (testCases: TestCase[]) => {
    // Implementation of handleExportDOCX function
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
            AI Test Case Generator
          </h1>
          <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
            Generate comprehensive test cases using advanced AI models.
          </p>
        </div>
        
        <div className="space-y-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
            <div className="flex flex-col space-y-6">
              {/* Top row with agent info and new session button */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <QuickModelSwitcher domain="testCases" />
                {hasExistingData() && (
                  <Button
                    onClick={handleNewSession}
                    className="group relative flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-blue-100 backdrop-blur-sm rounded-xl px-4 py-2 transition-all duration-200"
                  >
                    <ArrowPathIcon className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                    <span className="relative">
                      New Session
                      {getCurrentTestCases().length > 0 && (
                        <span className="absolute -top-1 -right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                      )}
                    </span>
                  </Button>
                )}
              </div>

              {/* Bottom row with generation controls */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <TestCaseModeToggle 
                    mode={testCaseMode} 
                    onModeChange={setTestCaseMode}
                  />
                </div>
                <div className="flex-1">
                  <TestPriorityToggle
                    priorityMode={testPriorityMode}
                    onPriorityChange={setTestPriorityMode}
                    testCaseMode={testCaseMode}
                  />
                </div>
              </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-50">Agentic Workflow</h2>
              <p className="text-sm text-blue-200/80">
                Enable planner, writer, and reviewer passes for broader coverage.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-blue-100">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-blue-500"
                checked={agenticEnabled}
                onChange={(event) => setAgenticEnabled(event.target.checked)}
              />
              <span>Enable agentic mode</span>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-blue-200/80 mb-2">
                Review passes
              </label>
              <input
                type="number"
                min={0}
                max={6}
                value={reviewPasses}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setReviewPasses(Number.isNaN(value) ? 0 : value);
                }}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Set to 0 to skip reviewer passes.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-blue-200/80 mb-2">
                Writer concurrency
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={writerConcurrency}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setWriterConcurrency(Number.isNaN(value) ? 1 : value);
                }}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Increase to run multiple plan slices in parallel (may raise duplicate risk).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-blue-200/80 mb-2">
                Planner model override
              </label>
              <select
                value={plannerModelOverride || settings.testCases.model}
                onChange={(event) => {
                  const value = event.target.value;
                  setPlannerModelOverride(value === settings.testCases.model ? '' : value);
                }}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {plannerModelOptions.map((option) => (
                  <option key={option.model} value={option.model} className="bg-slate-900 text-blue-50">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Choose a planner model; defaults to the main generator model.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-blue-200/80 mb-2">
                Writer model override
              </label>
              <select
                value={writerModelOverride || settings.testCases.model}
                onChange={(event) => {
                  const value = event.target.value;
                  setWriterModelOverride(value === settings.testCases.model ? '' : value);
                }}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {writerModelOptions.map((option) => (
                  <option key={option.model} value={option.model} className="bg-slate-900 text-blue-50">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Select the test case writer model; defaults to the main generator model.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-blue-200/80 mb-2">
                Reviewer provider
              </label>
              <select
                value={reviewerProviderOverride}
                onChange={(event) => setReviewerProviderOverride(event.target.value as 'same' | LLMProvider)}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewerProviderOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-blue-50">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Default uses the same provider as the writer.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-blue-200/80 mb-2">
                Reviewer model override
              </label>
              <select
                value={reviewerModelOverride || reviewerDefaultModel}
                onChange={(event) => {
                  const value = event.target.value;
                  setReviewerModelOverride(value === reviewerDefaultModel ? '' : value);
                }}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reviewerModelOptions.map((option) => (
                  <option key={option.model} value={option.model} className="bg-slate-900 text-blue-50">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Select a reviewer model; defaults to the writer model.</p>
            </div>
          </div>
        </div>

        <div>
          <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl border border-white/20">
                <FileUpload 
                  onFilesSelect={handleFilesSelect}
                  shouldReset={shouldResetFiles}
                  tokenSummary={fileTokenSummary}
                  tokenStatus={fileTokenStatus}
                  tokenError={fileTokenError}
                />
                {uploadedFiles.length > 0 && (
                  <div className="flex items-center text-sm text-blue-100 mt-4">
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'} ready for processing
                      {fileContent && (
                        <button
                          onClick={() => setIsFileContentVisible(!isFileContentVisible)}
                          className="ml-2 text-blue-300 hover:text-blue-200 underline font-medium"
                        >
                          View extracted content
                        </button>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl border border-white/20">
                <RequirementsInput
                  onSubmit={handleRequirementsSubmit}
                  initialValue={requirements}
                  placeholder="Enter additional requirements or specifications here..."
                  isEnabled={true}
                  hasUploadedFiles={uploadedFiles.length > 0}
                  onChange={(value) => setRequirements(value)}
                />
              </div>
            </div>
          </div>

          {isFileContentVisible && fileContent && (
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-100">Extracted Content Preview</h3>
                <button
                  onClick={() => setIsFileContentVisible(false)}
                  className="text-blue-200 hover:text-blue-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-sm text-blue-100 whitespace-pre-wrap bg-white/5 rounded-lg p-4 border border-white/10">{fileContent}</div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 backdrop-blur-lg border border-red-500/20 rounded-xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-300">Error</h3>
                  <p className="mt-1 text-sm text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!error && generationWarnings.length > 0 && (
            <div className="bg-amber-500/10 backdrop-blur-lg border border-amber-500/30 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-amber-200 uppercase tracking-wide">Warnings</h3>
              <ul className="mt-3 space-y-2 text-sm text-amber-100">
                {generationWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300/80"></span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {generationPlan.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-blue-50">Planner Output</h3>
                  <p className="text-xs text-blue-200/70">{generationPlan.length} coverage segments</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanDetails((prev) => !prev)}
                  className="text-xs font-semibold text-blue-200 hover:text-blue-100 border border-white/20 rounded-full px-3 py-1 transition-colors"
                >
                  {showPlanDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>
              {showPlanDetails && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {generationPlan.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-blue-50">{item.title}</p>
                          <p className="text-xs text-blue-200/70">Area: {item.area}</p>
                        </div>
                        {item.estimatedCases && (
                          <span className="text-xs font-medium text-blue-100 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1">
                            ~{item.estimatedCases} cases
                          </span>
                        )}
                      </div>
                      {item.focus && (
                        <p className="text-sm text-blue-100/90">
                          <span className="font-medium text-blue-200">Focus:</span> {item.focus}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-blue-200/70">{item.notes}</p>
                      )}
                      {item.chunkRefs && item.chunkRefs.length > 0 && (
                        <p className="text-xs text-blue-200/60">
                          References: {item.chunkRefs.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reviewFeedback.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-blue-50">Reviewer Feedback</h3>
                  <p className="text-xs text-blue-200/70">{reviewFeedback.length} issues flagged</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewDetails((prev) => !prev)}
                  className="text-xs font-semibold text-blue-200 hover:text-blue-100 border border-white/20 rounded-full px-3 py-1 transition-colors"
                >
                  {showReviewDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>
              {showReviewDetails && (
                <div className="mt-4 space-y-3">
                  {reviewFeedback.map((item, index) => (
                    <div key={`${item.caseId}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-blue-50">Case {item.caseId}</p>
                        <span className={`text-xs font-semibold tracking-wide rounded-full border px-3 py-1 ${severityStyles[item.severity] ?? severityStyles.info}`}>
                          {item.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-blue-100">{item.summary}</p>
                      <p className="mt-2 text-xs text-blue-200/70">
                        <span className="font-semibold text-blue-200">Suggestion:</span> {item.suggestion}
                      </p>
                      <p className="mt-2 text-xs text-blue-200/60">Tag: {item.issueType}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {generationTelemetry && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-blue-50">Run Telemetry</h3>
                  <p className="text-xs text-blue-200/70">Provider: {generationTelemetry.provider ?? settings.testCases.provider}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTelemetryDetails((prev) => !prev)}
                  className="text-xs font-semibold text-blue-200 hover:text-blue-100 border border-white/20 rounded-full px-3 py-1 transition-colors"
                >
                  {showTelemetryDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>
              {showTelemetryDetails && (
                <>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-blue-100">
                    <div>
                      <dt className="text-blue-200/70">Total duration</dt>
                      <dd className="font-semibold">{formatDuration(generationTelemetry.totalDurationMs)}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Planner</dt>
                      <dd className="font-semibold">{formatDuration(generationTelemetry.plannerDurationMs)}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Writer</dt>
                      <dd className="font-semibold">{formatDuration(generationTelemetry.writerDurationMs)}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Reviewer</dt>
                      <dd className="font-semibold">{formatDuration(generationTelemetry.reviewerDurationMs)}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Writer concurrency</dt>
                      <dd className="font-semibold">{generationTelemetry.writerConcurrency ?? 1}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Plan items</dt>
                      <dd className="font-semibold">{generationTelemetry.planItemCount ?? generationPlan.length}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Test cases</dt>
                      <dd className="font-semibold">{generationTelemetry.testCaseCount ?? getCurrentTestCases().length}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Review passes</dt>
                      <dd className="font-semibold">{generationTelemetry.reviewPasses?.length ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-blue-200/70">Passes executed</dt>
                      <dd className="font-semibold">{generationTelemetry.reviewPasses?.map((pass) => pass.pass).join(', ') || '—'}</dd>
                    </div>
                  </dl>

                  {(generationTelemetry.writerSlices?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">Writer slices</h4>
                      <ul className="mt-2 grid gap-2 text-xs text-blue-200/80">
                        {generationTelemetry.writerSlices?.map((slice) => (
                          <li key={slice.planId} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-blue-100">{slice.planId}</span>
                              <span>{formatDuration(slice.durationMs)}</span>
                            </div>
                            <p className="mt-1">{slice.caseCount} cases generated</p>
                            {slice.warnings && slice.warnings.length > 0 && (
                              <p className="mt-1 text-[0.7rem] text-amber-200">{slice.warnings.join(' ')}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(generationTelemetry.reviewPasses?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">Review rounds</h4>
                      <ul className="mt-2 grid gap-2 text-xs text-blue-200/80">
                        {generationTelemetry.reviewPasses?.map((pass) => (
                          <li key={pass.pass} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between">
                            <span className="font-semibold text-blue-100">Pass {pass.pass}</span>
                            <span>{pass.feedbackCount} notes · {pass.blockingCount} blocking · {formatDuration(pass.durationMs)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {shouldRenderProgressCard && (
            <div ref={progressRef}>
              <AnimatePresence>
                <ProgressCard key="progress-card" showSpinner={generationStep !== 'complete'} />
              </AnimatePresence>
            </div>
          )}

          {generationStep === 'complete' && getCurrentTestCases().length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20 animate-fade-in">
              <TestCaseList
                testCases={getCurrentTestCases()}
                onRegenerate={handleRegenerate}
                onUpdate={handleTestCaseUpdate}
                mode={testCaseMode}
                convertedTestCases={convertedTestCases}
                onSelectTestCase={testCaseMode === 'high-level' ? handleSelectTestCase : undefined}
                selectedTestCases={selectedTestCases}
                onConvertSelected={testCaseMode === 'high-level' ? handleConvertSelected : undefined}
                convertedScenarioIds={convertedScenarioIds}
                onUpdateConverted={setConvertedTestCases}
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => {
          setIsConfirmDialogOpen(false);
          setConfirmationType(null);
        }}
        onConfirm={clearSession}
        {...getConfirmationDetails()}
        cancelLabel="Cancel"
      />
    </main>
  );
} 
