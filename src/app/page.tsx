'use client';

import { useState } from 'react';
import { ModelSelector } from '@/components/ModelSelector';
import { FileUpload } from '../components/FileUpload';
import { RequirementsInput } from '@/components/RequirementsInput';
import { TestCaseList } from '@/components/TestCaseList';
import { createAIService } from '@/lib/services/ai/factory';
import { AIModel, TestCase } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { parseDocument } from '@/lib/services/documentParser';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>('Gemini');
  const [requirements, setRequirements] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'generating' | 'complete'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isFileContentVisible, setIsFileContentVisible] = useState(false);

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
  };

  const handleFilesSelect = async (files: File[]) => {
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
        files: uploadedFiles
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
          <ModelSelector onModelSelect={handleModelSelect} selectedModel={selectedModel} />
          
          <div className="space-y-6">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <FileUpload onFilesSelect={handleFilesSelect} />
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
                isEnabled={true} // Always enable input
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
                <h2 className="text-xl font-semibold text-green-800">
                  ✨ Test Cases Generated Successfully!
                </h2>
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  {testCases.length} Tests
                </span>
              </div>
              <TestCaseList
                testCases={testCases}
                onRegenerate={handleRegenerate}
                onUpdate={handleTestCaseUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 