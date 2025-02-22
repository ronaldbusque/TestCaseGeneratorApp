'use client';

import { useState } from 'react';
import { ModelSelector } from '@/components/ModelSelector';
import { FileUpload } from '../components/FileUpload';
import { RequirementsInput } from '@/components/RequirementsInput';
import { TestCaseList } from '@/components/TestCaseList';
import { createAIService } from '@/lib/services/ai/factory';
import { AIModel, TestCase, TestCaseMode } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { parseDocument } from '@/lib/services/documentParser';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { TestCaseModeToggle } from '@/components/TestCaseModeToggle';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>('Gemini');
  const [testCaseMode, setTestCaseMode] = useState<TestCaseMode>('high-level');
  const [requirements, setRequirements] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'generating' | 'complete'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isFileContentVisible, setIsFileContentVisible] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingModelChange, setPendingModelChange] = useState<AIModel | null>(null);
  const [confirmationType, setConfirmationType] = useState<'new_session' | 'model_change' | null>(null);
  const [shouldResetFiles, setShouldResetFiles] = useState(false);

  const clearSession = () => {
    setRequirements('');
    setFileContent('');
    setTestCases([]);
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
    return uploadedFiles.length > 0 || requirements.trim() !== '' || testCases.length > 0;
  };

  const handleFilesSelect = async (files: File[]) => {
    setShouldResetFiles(false); // Reset the flag when new files are selected
    try {
      setUploadedFiles(files);
      setGenerationStep('analyzing');
      
      const extractedRequirements = await Promise.all(
        files.map(file => parseDocument(file))
      );

      const textRequirements = extractedRequirements
        .filter(req => req) // Remove any null results
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
      setGenerationStep('generating');

      // Combine file content with manual requirements
      const combinedRequirements = [fileContent, manualRequirements]
        .filter(Boolean)
        .join('\n\n');

      const aiService = createAIService(selectedModel);
      const result = await aiService.generateTestCases({
        requirements: combinedRequirements,
        files: uploadedFiles,
        mode: testCaseMode
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setTestCases(result.testCases);
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
    setTestCases(updatedTestCases);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            AI Test Case Generator
          </h1>
          <p className="mt-3 text-base text-gray-500 sm:text-lg">
            Generate comprehensive test cases using AI models
          </p>
        </div>
        
        <div className="mt-8 sm:mt-12 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <ModelSelector onModelSelect={handleModelSelect} selectedModel={selectedModel} />
              <TestCaseModeToggle mode={testCaseMode} onModeChange={setTestCaseMode} />
            </div>
            {hasExistingData() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewSession}
                className="ml-4 group relative flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              >
                <ArrowPathIcon className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                <span className="relative">
                  New Session
                  {testCases.length > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </span>
              </Button>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <FileUpload 
                  onFilesSelect={handleFilesSelect}
                  shouldReset={shouldResetFiles}
                />
                {uploadedFiles.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'} ready for processing
                      {fileContent && (
                        <button
                          onClick={() => setIsFileContentVisible(!isFileContentVisible)}
                          className="ml-2 text-blue-500 hover:text-blue-600 underline"
                        >
                          View extracted content
                        </button>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <RequirementsInput
                onSubmit={handleRequirementsSubmit}
                initialValue={requirements}
                placeholder="Enter additional test requirements here..."
                isEnabled={true}
                hasUploadedFiles={uploadedFiles.length > 0}
              />
            </div>

            {isFileContentVisible && fileContent && (
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Extracted Content Preview</h3>
                  <button
                    onClick={() => setIsFileContentVisible(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">{fileContent}</div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              <h3 className="font-semibold">Error</h3>
              <p>{error}</p>
            </div>
          )}

          <AnimatePresence>
            {generationStep === 'analyzing' && (
              <LoadingAnimation message="Analyzing uploaded files..." />
            )}
            {generationStep === 'generating' && (
              <LoadingAnimation message="Generating test cases..." />
            )}
          </AnimatePresence>

          {generationStep === 'complete' && testCases.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-green-800">
                    ✨ Test Cases Generated Successfully!
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {testCaseMode === 'high-level' ? 'High-level' : 'Detailed'}
                  </span>
                </div>
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  {testCases.length} Tests
                </span>
              </div>
              <TestCaseList
                testCases={testCases}
                onRegenerate={handleRegenerate}
                onUpdate={handleTestCaseUpdate}
                mode={testCaseMode}
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