'use client';

import { useState, useEffect } from 'react';
import { ModelSelector } from '@/components/ModelSelector';
import { FileUpload } from '../components/FileUpload';
import { RequirementsInput } from '@/components/RequirementsInput';
import { TestCaseList } from '@/components/TestCaseList';
import { createAIService } from '@/lib/services/ai/factory';
import { AIModel, TestCase, TestCaseMode, HighLevelTestCase, TestPriorityMode } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { parseDocument } from '@/lib/services/documentParser';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ArrowPathIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { TestCaseModeToggle } from '@/components/TestCaseModeToggle';
import { NetworkBackground } from '@/components/NetworkBackground';
import { TestPriorityToggle } from '@/components/TestPriorityToggle';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { NavigationBar } from '@/components/NavigationBar';
import { fetchApi } from '@/lib/utils/apiClient';

const isHighLevelTestCase = (testCase: TestCase): testCase is HighLevelTestCase => {
  return 'scenario' in testCase && 'area' in testCase;
};

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>('Gemini');
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
    'idle' | 
    'preprocessing' | 
    'analyzing' | 
    'parsing' | 
    'generating' | 
    'formatting' |
    'complete'
  >('idle');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isFileContentVisible, setIsFileContentVisible] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingModelChange, setPendingModelChange] = useState<AIModel | null>(null);
  const [confirmationType, setConfirmationType] = useState<'new_session' | 'model_change' | null>(null);
  const [shouldResetFiles, setShouldResetFiles] = useState(false);

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
    setIsFileContentVisible(false);
    setGenerationStep('idle');
    setShouldResetFiles(true);
    
    if (pendingModelChange) {
      setSelectedModel(pendingModelChange);
      setPendingModelChange(null);
    }
  };

  const handleModelSelect = (model: AIModel) => {
    if (model === selectedModel) return;

    if (hasExistingData()) {
      setPendingModelChange(model);
      setConfirmationType('model_change');
      setIsConfirmDialogOpen(true);
    } else {
      setSelectedModel(model);
    }
  };

  const handleNewSession = () => {
    setConfirmationType('new_session');
    setIsConfirmDialogOpen(true);
  };

  const getConfirmationDetails = () => {
    if (confirmationType === 'model_change') {
      return {
        title: "Change AI Model",
        message: `Switching to ${pendingModelChange} model will clear your current work. Would you like to proceed?`,
        confirmLabel: "Switch Model",
      };
    }
    return {
      title: "Start New Session",
      message: "This will clear all current files, requirements, and generated test cases. Are you sure you want to start fresh?",
      confirmLabel: "Clear & Start New",
    };
  };

  const hasExistingData = () => {
    return uploadedFiles.length > 0 || requirements.trim() !== '' || getCurrentTestCases().length > 0;
  };

  const handleFilesSelect = async (files: File[]) => {
    setShouldResetFiles(false); // Reset the flag when new files are selected
    setUploadedFiles(files); // Update uploadedFiles first
    
    // If no files, clear content and return early
    if (files.length === 0) {
      setFileContent('');
      setGenerationStep('idle');
      return;
    }

    try {
      setGenerationStep('analyzing');
      
      // Skip file parsing for Gemini model as it handles files natively
      if (selectedModel === 'Gemini') {
        // For Gemini, just show a list of uploaded files
        const fileList = files.map(file => file.name).join('\n');
        setFileContent(`Uploaded Files:\n${fileList}`);
        setGenerationStep('idle');
        return;
      }

      const extractedRequirements = await Promise.all(
        files.map(file => parseDocument(file))
      );

      const textRequirements = extractedRequirements
        .filter(req => req) // Remove any null results
        .map(result => result.content) // Extract the content from the parsing result
        .filter(content => content.trim()) // Remove empty content
        .join('\n\n');

      // Handle image files
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      const imageRequirements = imageFiles.length > 0 
        ? `\n\nImage Files for Testing:\n${imageFiles.map(file => `- ${file.name}`).join('\n')}`
        : '';

      // Combine text and image requirements
      const combinedRequirements = textRequirements + imageRequirements;

      if (combinedRequirements) {
        setFileContent(combinedRequirements);
      } else if (imageFiles.length > 0) {
        // If we only have images and no text requirements, set a default message
        setFileContent('Image files uploaded for testing.');
      }

      setGenerationStep('idle');
    } catch (error) {
      console.error('File processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process files');
      setGenerationStep('idle');
    }
  };

  const generateTestCases = async (manualRequirements: string) => {
    try {
      setError(null);
      setIsGenerating(true);
      
      // Only clear converted states when generating new high-level test cases
      if (testCaseMode === 'high-level') {
        setConvertedTestCases([]);
        setConvertedScenarioIds(new Set());
      }

      // Start preprocessing
      setGenerationStep('preprocessing');
      await new Promise(resolve => setTimeout(resolve, 800)); // Add slight delay for visual feedback

      // Generation phase
      setGenerationStep('analyzing');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Parsing phase
      setGenerationStep('parsing');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generation phase
      setGenerationStep('generating');
      
      // Call the protected API endpoint instead of using the AI service directly
      console.log(`[Client] Calling test case generation API - Mode: ${testCaseMode}, Model: ${selectedModel}`);
      const result = await fetchApi('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          requirements: manualRequirements,
          fileContent: fileContent, // Pass the file content separately
          mode: testCaseMode,
          priorityMode: testPriorityMode,
          model: selectedModel
        })
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Formatting phase
      setGenerationStep('formatting');
      await new Promise(resolve => setTimeout(resolve, 600));

      setCurrentTestCases(result.testCases);
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
      if (id.startsWith(prefix)) {
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
      const selectedScenarios = getCurrentTestCases()
        .filter((tc): tc is HighLevelTestCase => 
          isHighLevelTestCase(tc) && selectedTestCases.has(tc.id)
        );
      
      // Call the protected API endpoint instead of using the AI service directly
      console.log(`[Client] Calling test case conversion API - Selected scenarios: ${selectedScenarios.length}, Model: ${selectedModel}`);
      const result = await fetchApi('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          requirements,
          mode: 'detailed',
          selectedScenarios,
          model: selectedModel
        })
      });

      if (result.error) {
        setError(result.error);
      } else if (result.testCases) {
        // First, prepare all the IDs we'll need
        const existingIds: Set<string> = new Set([
          ...convertedTestCases.map(tc => tc.id),
          ...getCurrentTestCases().map(tc => tc.id)
        ]);

        // Generate IDs for all new test cases first
        const newIds: string[] = result.testCases.map((_: any, index: number) => {
          const originalScenario = selectedScenarios[index];
          const baseId = originalScenario?.id || '';
          const matchNumber = baseId.split('-')[1];
          let id = matchNumber ? `TC-${matchNumber}` : getNextTestCaseId('TC');
          
          // If the ID already exists, generate a new one
          while (existingIds.has(id)) {
            id = getNextTestCaseId('TC');
          }
          existingIds.add(id); // Add to set to prevent duplicates in subsequent iterations
          return id;
        });

        // Now create the test cases with their unique IDs
        const newTestCases: TestCase[] = result.testCases.map((tc: any, index: number) => {
          const originalScenario = selectedScenarios[index];
          return {
            ...tc,
            id: newIds[index],
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
              {/* Top row with model selector and new session button */}
              <div className="flex items-center justify-between">
                <ModelSelector onModelSelect={handleModelSelect} selectedModel={selectedModel} />
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

          <div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl border border-white/20">
                <FileUpload 
                  onFilesSelect={handleFilesSelect}
                  shouldReset={shouldResetFiles}
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

          <AnimatePresence>
            {generationStep !== 'idle' && generationStep !== 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20"
              >
                <LoadingAnimation message={`${generationStep.charAt(0).toUpperCase() + generationStep.slice(1)}...`} />
              </motion.div>
            )}
          </AnimatePresence>

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
          setPendingModelChange(null);
          setConfirmationType(null);
        }}
        onConfirm={clearSession}
        {...getConfirmationDetails()}
        cancelLabel="Cancel"
      />
    </main>
  );
} 