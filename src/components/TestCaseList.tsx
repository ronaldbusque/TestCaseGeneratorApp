'use client';

import { TestCase, TestCaseMode, HighLevelTestCase, DetailedTestCase } from '@/lib/types';
import { Button } from './ui/Button';
import { ChevronDownIcon, ChevronUpIcon, ClipboardIcon, PencilIcon, ArrowPathIcon, ArrowDownIcon, CheckCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TestCaseEditForm } from './TestCaseEditForm';
import ReactMarkdown from 'react-markdown';
import type { Document, Paragraph, TextRun, HeadingLevel, Packer, ISectionOptions } from 'docx';
import { Workbook } from 'exceljs';

interface TestCaseListProps {
  testCases: TestCase[];
  onRegenerate: () => void;
  onUpdate: (testCases: TestCase[]) => void;
  mode: TestCaseMode;
  convertedTestCases?: TestCase[];
  onSelectTestCase?: (id: string, selected: boolean) => void;
  selectedTestCases?: Set<string>;
  onConvertSelected?: () => void;
  convertedScenarioIds?: Set<string>;
  onUpdateConverted?: (testCases: TestCase[]) => void;
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

export function TestCaseList({ 
  testCases, 
  onRegenerate, 
  onUpdate, 
  mode,
  convertedTestCases = [],
  onSelectTestCase,
  selectedTestCases = new Set(),
  onConvertSelected,
  convertedScenarioIds = new Set(),
  onUpdateConverted
}: TestCaseListProps) {
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

  const handleSaveConverted = (updatedTestCase: TestCase) => {
    if (!onUpdateConverted) return;
    const newTestCases = convertedTestCases.map(tc => 
      tc.id === updatedTestCase.id ? {
        ...tc,
        markdownContent: updatedTestCase.markdownContent
      } : tc
    );
    onUpdateConverted(newTestCases);
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

  const getConvertedTestCase = (scenarioId: string) => {
    return convertedTestCases.find(tc => tc.originalScenarioId === scenarioId);
  };

  const handleExportCSV = (testCases: TestCase[]) => {
    const headers = ['ID', 'Title', 'Area', 'Scenario'];
    const rows = testCases.map((tc) => {
      if (!isHighLevelTestCase(tc)) return [];
      return [
        tc.id,
        tc.title,
        tc.area,
        tc.scenario
      ];
    }).filter(row => row.length > 0);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'test-scenarios.csv';
    link.click();
  };

  const handleExportXLSX = async (testCases: TestCase[]) => {
    try {
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Test Scenarios');

      // Define columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Title', key: 'title', width: 30 },
        { header: 'Area', key: 'area', width: 15 },
        { header: 'Scenario', key: 'scenario', width: 50 }
      ];

      // Add data
      const scenarioData = testCases
        .filter(isHighLevelTestCase)
        .map(tc => ({
          id: tc.id,
          title: tc.title,
          area: tc.area,
          scenario: tc.scenario
        }));

      worksheet.addRows(scenarioData);

      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Generate blob and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'test-scenarios.xlsx';
      link.click();
    } catch (error) {
      console.error('Failed to export XLSX:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  const handleExportDOCX = async (testCases: TestCase[]) => {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');
      
      const children = testCases
        .filter(isHighLevelTestCase)
        .reduce((acc: ISectionOptions['children'], tc) => {
          return [
            ...acc,
            new Paragraph({
              text: tc.title,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "ID: ", bold: true }),
                new TextRun(tc.id),
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Area: ", bold: true }),
                new TextRun(tc.area),
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Scenario: ", bold: true }),
                new TextRun(tc.scenario),
              ],
              spacing: { after: 400 }
            }),
          ];
        }, []);

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "Test Scenarios",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 400 }
            }),
            ...children
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'test-scenarios.docx';
      link.click();
    } catch (error) {
      console.error('Failed to export DOCX:', error);
      alert('Failed to export Word document. Please try again.');
    }
  };

  if (!testCases.length) return null;

  return (
    <div className="space-y-8">
      {!testCases.length ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No test cases generated yet</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'high-level' ? 'Test Scenarios' : 'Test Cases'} ({testCases.length})
              </h2>
              {mode === 'high-level' && (
                <span className="bg-purple-100/80 backdrop-blur-sm text-purple-800 text-sm px-3 py-1 rounded-full font-medium">
                  High-level Overview
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {mode === 'high-level' && (
                <div className="relative group">
                  <Button
                    variant="outline"
                    className="group bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <div className="absolute right-0 mt-1 w-48 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-100">
                    <div className="py-1">
                      <button
                        onClick={() => handleExportCSV(testCases)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExportXLSX(testCases)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Export as Excel
                      </button>
                      <button
                        onClick={() => handleExportDOCX(testCases)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Export as Word
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {mode === 'high-level' && onConvertSelected && (
                <Button
                  onClick={onConvertSelected}
                  variant="outline"
                  className="group bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200"
                  disabled={selectedTestCases.size === 0}
                >
                  <ArrowDownIcon className="h-4 w-4 mr-2" />
                  Convert Selected to Detailed
                </Button>
              )}
              <Button
                onClick={onRegenerate}
                variant="outline"
                className="group bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200"
                title={`Generate new ${mode === 'high-level' ? 'scenarios' : 'test cases'}`}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform" />
                Generate New Set
              </Button>
            </div>
          </div>
          <div className="space-y-6">
            {mode === 'high-level' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(
                  testCases.reduce((acc: Record<string, TestCase[]>, testCase) => {
                    if (isHighLevelTestCase(testCase)) {
                      const area = testCase.area || 'General';
                      acc[area] = [...(acc[area] || []), testCase];
                    }
                    return acc;
                  }, {})
                ).map(([area, areaTestCases]) => (
                  <div key={area} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{area}</h3>
                    <div className="space-y-3">
                      {areaTestCases.map((testCase) => {
                        if (!isHighLevelTestCase(testCase)) return null;
                        const isConverted = convertedScenarioIds.has(testCase.id);
                        const convertedTestCase = getConvertedTestCase(testCase.id);
                        return (
                          <div
                            key={testCase.id}
                            className={cn(
                              "border border-gray-200 rounded-lg p-4 transition-all duration-200",
                              isConverted ? "bg-gray-50/80" : "hover:bg-gray-50/80 hover:shadow-md"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {onSelectTestCase && !isConverted && (
                                  <input
                                    type="checkbox"
                                    checked={selectedTestCases.has(testCase.id)}
                                    onChange={(e) => onSelectTestCase(testCase.id, e.target.checked)}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                )}
                                {isConverted && (
                                  <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    <span>Converted to {convertedTestCase?.id}</span>
                                  </span>
                                )}
                                <span className="text-sm font-medium text-gray-900">{testCase.title}</span>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(testCase);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Copy scenario"
                                >
                                  <ClipboardIcon className="h-4 w-4" />
                                  {copiedId === testCase.id && (
                                    <span className="absolute -top-2 -right-2 px-2 py-1 text-xs text-white bg-green-500 rounded-md shadow-sm">
                                      Copied!
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">{testCase.scenario}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mode === 'detailed' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(
                  localTestCases.reduce((acc: Record<string, TestCase[]>, testCase) => {
                    if (!isHighLevelTestCase(testCase)) {
                      const area = extractAreaFromTestCase(testCase as DetailedTestCase);
                      acc[area] = [...(acc[area] || []), testCase];
                    }
                    return acc;
                  }, {})
                ).map(([area, areaTestCases]) => (
                  <div key={area} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{area}</h3>
                    <div className="space-y-4">
                      {areaTestCases.map((testCase) => (
                        <motion.div
                          key={testCase.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-lg overflow-hidden bg-white/50 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/80">
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
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => handleEdit(e, testCase)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                title="Edit test case"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(testCase);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                title="Copy test case"
                              >
                                <ClipboardIcon className="h-4 w-4" />
                                {copiedId === testCase.id && (
                                  <span className="absolute -top-2 -right-2 px-2 py-1 text-xs text-white bg-green-500 rounded-md shadow-sm">
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
          {/* Converted Test Cases Section */}
          {convertedTestCases.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Converted Test Cases ({convertedTestCases.length})
                </h2>
                <span className="bg-green-100/80 backdrop-blur-sm text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                  Detailed View
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(
                  convertedTestCases.reduce((acc: Record<string, TestCase[]>, testCase) => {
                    const area = testCase.area || 'General';
                    acc[area] = [...(acc[area] || []), testCase];
                    return acc;
                  }, {})
                ).map(([area, areaTestCases]) => (
                  <div key={area} className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{area}</h3>
                    <div className="space-y-4">
                      {areaTestCases.map((testCase) => (
                        <motion.div
                          key={testCase.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-lg overflow-hidden bg-white/50 transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/80">
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
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => handleEdit(e, testCase)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                title="Edit test case"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(testCase);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                title="Copy test case"
                              >
                                <ClipboardIcon className="h-4 w-4" />
                                {copiedId === testCase.id && (
                                  <span className="absolute -top-2 -right-2 px-2 py-1 text-xs text-white bg-green-500 rounded-md shadow-sm">
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
                              >
                                {editingId === testCase.id ? (
                                  <div className="px-4 py-3">
                                    <TestCaseEditForm
                                      testCase={testCase}
                                      onChange={(updatedTestCase) => {
                                        if (!onUpdateConverted) return;
                                        const newTestCases = convertedTestCases.map(tc => 
                                          tc.id === updatedTestCase.id ? {
                                            ...tc,
                                            markdownContent: updatedTestCase.markdownContent
                                          } : tc
                                        );
                                        onUpdateConverted(newTestCases);
                                      }}
                                      onSave={() => handleSaveConverted(testCase)}
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
            </div>
          )}
        </>
      )}
    </div>
  );
} 