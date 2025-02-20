'use client';

import { TestCase } from '@/lib/types';
import { Button } from './ui/Button';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TestCaseEditForm } from './TestCaseEditForm';
import ReactMarkdown from 'react-markdown';

interface TestCaseListProps {
  testCases: TestCase[];
  onRegenerate: () => void;
  onUpdate: (testCases: TestCase[]) => void;
}

export function TestCaseList({ testCases, onRegenerate, onUpdate }: TestCaseListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localTestCases, setLocalTestCases] = useState(testCases);

  useEffect(() => {
    setLocalTestCases(testCases);
  }, [testCases]);

  const toggleExpanded = (id: string) => {
    const newIds = new Set(expandedIds);
    if (newIds.has(id)) {
      newIds.delete(id);
    } else {
      newIds.add(id);
    }
    setExpandedIds(newIds);
  };

  const handleEdit = (e: React.MouseEvent, testCase: TestCase) => {
    e.stopPropagation();
    if (!expandedIds.has(testCase.id)) {
      setExpandedIds(new Set(expandedIds).add(testCase.id));
    }
    setEditingId(testCase.id);
  };

  const handleSave = (updatedTestCase: TestCase) => {
    const newTestCases = localTestCases.map(tc => 
      tc.id === updatedTestCase.id ? {
        ...tc,
        markdownContent: updatedTestCase.markdownContent
      } : tc
    );
    setLocalTestCases(newTestCases);
    onUpdate(newTestCases);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleCopy = async (testCase: TestCase) => {
    const textToCopy = testCase.markdownContent || formatTestCaseMarkdown(testCase);
    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(testCase.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTestCaseMarkdown = (testCase: TestCase): string => {
    const sections = [
      `# ${testCase.title} (${testCase.id})`,
      `## Description`,
      testCase.description,
      testCase.preconditions?.length ? 
        `## Preconditions\n${testCase.preconditions.map(p => `* ${p}`).join('\n')}` : '',
      testCase.testData?.length ? 
        `## Test Data\n${testCase.testData.map(d => `* ${d}`).join('\n')}` : '',
      `## Steps`,
      testCase.steps.map(s => `${s.number}. ${s.description}`).join('\n'),
      `## Expected Result`,
      testCase.expectedResult
    ];

    return sections.filter(Boolean).join('\n\n');
  };

  if (!testCases.length) return null;

  return (
    <div className="space-y-6">
      {!testCases.length ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No test cases generated yet</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Test Cases ({testCases.length})
            </h2>
            <Button
              onClick={onRegenerate}
              variant="outline"
              className="group"
              title="Generate new test cases based on current requirements"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform" />
              Generate New Set
            </Button>
          </div>
          <div className="space-y-4">
            {localTestCases.map((testCase) => (
              <motion.div
                key={testCase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white shadow rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <button
                    onClick={() => toggleExpanded(testCase.id)}
                    className="flex-1 flex items-center space-x-3 text-left"
                  >
                    <span className="text-sm font-medium text-gray-500">{testCase.id}</span>
                    <h3 className="text-lg font-medium text-gray-900">
                      {testCase.title}
                    </h3>
                    {expandedIds.has(testCase.id) ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleEdit(e, testCase)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                      title="Edit test case"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(testCase);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                      title="Copy test case"
                    >
                      <ClipboardIcon className="h-5 w-5" />
                      {copiedId === testCase.id && (
                        <span className="absolute top-0 right-0 px-2 py-1 text-xs text-white bg-green-500 rounded-md">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedIds.has(testCase.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200"
                    >
                      {editingId === testCase.id ? (
                        <div className="px-6 py-4">
                          <TestCaseEditForm
                            testCase={testCase}
                            onChange={(updatedTestCase) => {
                              const newTestCases = localTestCases.map(tc => 
                                tc.id === updatedTestCase.id ? {
                                  ...tc,
                                  markdownContent: updatedTestCase.markdownContent
                                } : tc
                              );
                              setLocalTestCases(newTestCases);
                            }}
                            onSave={() => handleSave(testCase)}
                            onCancel={handleCancel}
                          />
                        </div>
                      ) : (
                        <div className="px-6 py-4 space-y-4">
                          <div className="markdown-content">
                            <ReactMarkdown
                              components={{
                                h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
                                h2: ({children}) => <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{children}</h2>,
                                p: ({children}) => <p className="text-gray-600 mb-4">{children}</p>,
                                ul: ({children}) => <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside text-gray-600 mb-4 space-y-1">{children}</ol>,
                                li: ({children}) => <li className="ml-4 text-gray-600">{children}</li>,
                              }}
                            >
                              {testCase.markdownContent || formatTestCaseMarkdown(testCase)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 