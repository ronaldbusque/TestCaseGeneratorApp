'use client';

import { TestCase, TestCaseMode, HighLevelTestCase, DetailedTestCase } from '@/lib/types';
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
  mode: TestCaseMode;
}

const isHighLevelTestCase = (testCase: TestCase): testCase is HighLevelTestCase => {
  return 'scenario' in testCase && 'area' in testCase;
};

const extractAreaFromTestCase = (testCase: DetailedTestCase): string => {
  // Try to extract area from title first (e.g., "[Login] Valid credentials" -> "Login")
  const titleMatch = testCase.title.match(/^\[(.*?)\]/);
  if (titleMatch) {
    return titleMatch[1];
  }

  // Try to find common area keywords in the title
  const areaKeywords = ['Authentication', 'Login', 'Registration', 'User Management', 'Security', 'Profile', 'Settings', 'Dashboard', 'Reports', 'Admin'];
  const foundKeyword = areaKeywords.find(keyword => 
    testCase.title.toLowerCase().includes(keyword.toLowerCase()) ||
    testCase.description.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return foundKeyword || 'General';
};

export function TestCaseList({ testCases, onRegenerate, onUpdate, mode }: TestCaseListProps) {
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
    if (isHighLevelTestCase(testCase)) {
      return `# ${testCase.title} (${testCase.id})\n\n**Area:** ${testCase.area}\n\n**Scenario:** ${testCase.scenario}`;
    }

    // Detailed test case format
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
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'high-level' ? 'Test Scenarios' : 'Test Cases'} ({testCases.length})
              </h2>
              {mode === 'high-level' && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  High-level Overview
                </span>
              )}
            </div>
            <Button
              onClick={onRegenerate}
              variant="outline"
              className="group"
              title={`Generate new ${mode === 'high-level' ? 'scenarios' : 'test cases'}`}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform" />
              Generate New Set
            </Button>
          </div>
          <div className="space-y-4">
            {mode === 'high-level' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(
                  testCases.reduce((acc: Record<string, TestCase[]>, testCase) => {
                    if (isHighLevelTestCase(testCase)) {
                      const area = testCase.area || 'General';
                      acc[area] = [...(acc[area] || []), testCase];
                    }
                    return acc;
                  }, {})
                ).map(([area, areaTestCases]) => (
                  <div key={area} className="bg-white shadow rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">{area}</h3>
                    <div className="space-y-2">
                      {areaTestCases.map((testCase) => {
                        if (!isHighLevelTestCase(testCase)) return null;
                        return (
                          <div
                            key={testCase.id}
                            className="border border-gray-200 rounded p-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{testCase.title}</span>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(testCase);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                  title="Copy scenario"
                                >
                                  <ClipboardIcon className="h-4 w-4" />
                                  {copiedId === testCase.id && (
                                    <span className="absolute top-0 right-0 px-2 py-1 text-xs text-white bg-green-500 rounded-md">
                                      Copied!
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{testCase.scenario}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mode === 'detailed' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(
                  localTestCases.reduce((acc: Record<string, TestCase[]>, testCase) => {
                    if (!isHighLevelTestCase(testCase)) {
                      const area = extractAreaFromTestCase(testCase as DetailedTestCase);
                      acc[area] = [...(acc[area] || []), testCase];
                    }
                    return acc;
                  }, {})
                ).map(([area, areaTestCases]) => (
                  <div key={area} className="bg-white shadow rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">{area}</h3>
                    <div className="space-y-3">
                      {areaTestCases.map((testCase) => (
                        <motion.div
                          key={testCase.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                            <button
                              onClick={() => toggleExpanded(testCase.id)}
                              className="flex-1 flex items-center space-x-3 text-left"
                            >
                              <span className="text-sm font-medium text-gray-500">{testCase.id}</span>
                              <h3 className="text-sm font-medium text-gray-900">
                                {testCase.title}
                              </h3>
                              {expandedIds.has(testCase.id) ? (
                                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => handleEdit(e, testCase)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                title="Edit test case"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(testCase);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                title="Copy test case"
                              >
                                <ClipboardIcon className="h-4 w-4" />
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
                                  <div className="px-4 py-3">
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
                                  <div className="px-4 py-3">
                                    <div className="markdown-content text-sm">
                                      <ReactMarkdown
                                        components={{
                                          h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 mb-3">{children}</h1>,
                                          h2: ({children}) => <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h2>,
                                          p: ({children}) => <p className="text-gray-600 mb-3">{children}</p>,
                                          ul: ({children}) => <ul className="list-disc list-inside text-gray-600 mb-3 space-y-1">{children}</ul>,
                                          ol: ({children}) => <ol className="list-decimal list-inside text-gray-600 mb-3 space-y-1">{children}</ol>,
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 