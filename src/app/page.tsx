'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FileUpload } from '../components/FileUpload';
import { RequirementsInput } from '@/components/RequirementsInput';
import { TestCaseList } from '@/components/TestCaseList';
import { TestCase, TestCaseMode, HighLevelTestCase, TestPriorityMode, UploadedFilePayload, FileTokenSummary, GenerationPlanItem, ReviewFeedbackItem, AgenticTelemetry } from '@/lib/types';
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
import { fetchApi } from '@/lib/utils/apiClient';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';
import { QuickModelSwitcher } from '@/components/QuickModelSwitcher';
import type { LLMProvider } from '@/lib/types/providers';

const isHighLevelTestCase = (testCase: TestCase): testCase is HighLevelTestCase => {
  return 'scenario' in testCase && 'area' in testCase;
};

const MAX_FILE_CONTENT_LENGTH = 8000;
const MAX_FILE_PREVIEW_LENGTH = 500;

export default function Home() {
  const { settings, availableProviders } = useProviderSettings();
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

  const shouldShowProgressCard = generationStep !== 'idle';
  useEffect(() => {
    if (shouldShowProgressCard && progressRef.current) {
      progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [shouldShowProgressCard]);

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

  const ProgressCard = () => (
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
          <p className="text-sm font-semibold text-blue-50">{loadingMessage}</p>
          {progressDescription && (
            <p className="text-xs text-blue-200/80 mt-1">{progressDescription}</p>
          )}
        </div>
      </div>
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
    const writerModel = settings.testCases.model;
    const plannerModel = plannerModelOverride.trim();
    const reviewerModel = reviewerModelOverride.trim();

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
      plannerModel: plannerModel ? plannerModel : undefined,
      writerProvider,
      writerModel,
      reviewerProvider,
      reviewerModel: reviewerModel ? reviewerModel : undefined,
      maxReviewPasses: normalizedPasses,
      chunkStrategy: 'auto',
      writerConcurrency: normalizedConcurrency,
    } as const;
  }, [agenticEnabled, plannerModelOverride, reviewerModelOverride, reviewerProviderOverride, reviewPasses, writerConcurrency, settings.testCases.model, settings.testCases.provider]);

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
      setShowReviewDetails(false);

      // Only clear converted states when generating new high-level test cases
      if (testCaseMode === 'high-level') {
        setConvertedTestCases([]);
        setConvertedScenarioIds(new Set());
      }

      if (agenticEnabled) {
        setGenerationStep('planning');
      } else {
        setGenerationStep('generating');
      }

      const agenticOptions = buildAgenticOptions();

      if (agenticOptions?.enableAgentic) {
        setGenerationStep('generating');
      }

      const filePayloads = preparedFilePayloads.length === uploadedFiles.length
        ? preparedFilePayloads
        : await buildFilePayloads(uploadedFiles);

      // Call the protected API endpoint instead of using the AI service directly
      console.log(`[Client] Calling test case generation API - Mode: ${testCaseMode}`);
      const result = await fetchApi('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          requirements: manualRequirements,
          fileContent: fileContent, // Pass the file content separately
          mode: testCaseMode,
          priorityMode: testPriorityMode,
          files: filePayloads,
          provider: settings.testCases.provider,
          model: settings.testCases.model,
          agenticOptions,
        })
      });

      if (result.error) {
        throw new Error(result.error);
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
      setShowReviewDetails(false);

      setGenerationStep('finalizing');
      setGenerationStep('complete');
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
                onChange={(event) => setPlannerModelOverride(event.target.value)}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={settings.testCases.model} className="bg-slate-900 text-blue-50">
                  {settings.testCases.model}
                </option>
                {quickSelections
                  .filter((qs) => qs.provider === settings.testCases.provider)
                  .map((qs) => (
                    <option key={qs.id} value={qs.model} className="bg-slate-900 text-blue-50">
                      {qs.model}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[0.7rem] text-blue-200/60">Choose a planner model; defaults to the main generator model.</p>
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
                value={reviewerModelOverride || (reviewerProviderOverride === 'same' ? settings.testCases.model : '')}
                onChange={(event) => setReviewerModelOverride(event.target.value)}
                disabled={!agenticEnabled}
                className="w-full h-10 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={reviewerProviderOverride === 'same' ? settings.testCases.model : ''} className="bg-slate-900 text-blue-50">
                  {reviewerProviderOverride === 'same' ? settings.testCases.model : 'Default reviewer model'}
                </option>
                {quickSelections
                  .filter((qs) => qs.provider === (reviewerProviderOverride === 'same' ? settings.testCases.provider : reviewerProviderOverride))
                  .map((qs) => (
                    <option key={qs.id} value={qs.model} className="bg-slate-900 text-blue-50">
                      {qs.model}
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

          {shouldShowProgressCard && generationStep !== 'complete' && (
            <div ref={progressRef}>
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20"
                >
                  <LoadingAnimation message={`${loadingMessage}...`} />
                </motion.div>
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
