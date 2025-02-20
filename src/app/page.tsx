'use client';

import { useState } from 'react';
import { ModelSelector } from '@/components/ModelSelector';
import { FileUpload } from '../components/FileUpload';
import { RequirementsInput } from '@/components/RequirementsInput';
import { TestCaseList } from '@/components/TestCaseList';
import { parseWordDocument } from '@/lib/services/documentParser';
import { createAIService } from '@/lib/services/ai/factory';
import { AIModel, TestCase } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { LoadingAnimation } from '@/components/LoadingAnimation';

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>('O1-Mini');
  const [requirements, setRequirements] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'generating' | 'complete'>('idle');

  const handleFileSelect = async (file: File) => {
    try {
      const parsedRequirements = await parseWordDocument(file);
      setRequirements(parsedRequirements);
      setError(null);
    } catch (error) {
      console.error('Error parsing document:', error);
      setError('Failed to parse document. Please try again.');
    }
  };

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
  };

  const handleRequirementsSubmit = async (requirements: string) => {
    setError(null);
    setGenerationStep('analyzing');
    
    try {
      // Show analyzing state for a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGenerationStep('generating');
      const service = createAIService(selectedModel);
      const response = await service.generateTestCases({
        model: selectedModel,
        requirements
      });

      if (response.error) {
        setError(response.error);
        setGenerationStep('idle');
        return;
      }

      setTestCases(response.testCases);
      setGenerationStep('complete');
      
      // Auto-hide the success message after 5 seconds
      setTimeout(() => {
        setGenerationStep('idle');
      }, 5000);
      
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setGenerationStep('idle');
    }
  };

  const handleRegenerate = () => {
    handleRequirementsSubmit(requirements);
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
          <ModelSelector onModelSelect={handleModelSelect} />
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
            <FileUpload onFileSelect={handleFileSelect} />
            <RequirementsInput
              onSubmit={handleRequirementsSubmit}
              initialValue={requirements}
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              <h3 className="font-semibold">Error</h3>
              <p>{error}</p>
            </div>
          )}

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
            </div>
          )}

          <TestCaseList
            testCases={testCases}
            onRegenerate={handleRegenerate}
            onUpdate={handleTestCaseUpdate}
          />
        </div>
      </div>

      {(generationStep === 'analyzing' || generationStep === 'generating') && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <LoadingAnimation 
              message={
                generationStep === 'analyzing' 
                  ? "Analyzing Requirements..." 
                  : "Generating Test Cases..."
              } 
            />
          </div>
        </div>
      )}
    </main>
  );
} 