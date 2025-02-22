'use client';

import { TestCase, HighLevelTestCase } from '@/lib/types';
import { Button } from './ui/Button';
import { useState, useEffect } from 'react';

interface TestCaseEditFormProps {
  testCase: TestCase;
  onChange: (testCase: TestCase) => void;
  onSave: () => void;
  onCancel: () => void;
}

const isHighLevelTestCase = (testCase: TestCase): testCase is HighLevelTestCase => {
  return 'category' in testCase && 'considerations' in testCase;
};

export function TestCaseEditForm({ testCase, onChange, onSave, onCancel }: TestCaseEditFormProps) {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    setMarkdown(testCase.markdownContent || formatInitialMarkdown(testCase));
  }, [testCase]);

  const formatInitialMarkdown = (testCase: TestCase): string => {
    if (isHighLevelTestCase(testCase)) {
      const sections = [
        `# ${testCase.title} (${testCase.id})`,
        `## Category`,
        testCase.category,
        `## Description`,
        testCase.description,
        testCase.considerations?.length ? 
          `## Key Considerations\n${testCase.considerations.map(c => `* ${c}`).join('\n')}` : ''
      ];
      return sections.filter(Boolean).join('\n\n');
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

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMarkdown = e.target.value;
    setMarkdown(newMarkdown);
    onChange({
      ...testCase,
      markdownContent: newMarkdown
    });
  };

  const handleSaveClick = () => {
    onChange({
      ...testCase,
      markdownContent: markdown
    });
    onSave();
  };

  return (
    <div className="space-y-4">
      <textarea
        value={markdown}
        onChange={handleMarkdownChange}
        className="w-full h-96 font-mono text-sm p-4 border rounded-md"
        spellCheck={false}
      />
      <div className="flex justify-end space-x-3">
        <Button type="button" onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button type="button" onClick={handleSaveClick}>
          Save Changes
        </Button>
      </div>
    </div>
  );
} 