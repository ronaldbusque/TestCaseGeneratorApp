import {
  HighLevelTestCase,
  TestCase,
  TestCaseMode,
  TestCaseGenerationRequest,
  TestPriorityMode,
  UploadedFilePayload,
} from '@/lib/types';

const MAX_FILE_SUMMARY_LENGTH = 4000;

export function summarizeFiles(files?: UploadedFilePayload[]): string {
  if (!files?.length) {
    return '';
  }

  return files
    .map((file) => {
      const preview = file.preview ?? '';
      const trimmedPreview = preview.length > MAX_FILE_SUMMARY_LENGTH
        ? `${preview.slice(0, MAX_FILE_SUMMARY_LENGTH)}...`
        : preview;

      const baseDetails = [
        `File: ${file.name}`,
        `Type: ${file.type || 'unknown'}`,
        `Size: ${formatFileSize(file.size)}`,
        trimmedPreview ? 'Preview:\n' + trimmedPreview : 'Preview: [No readable text extracted]'
      ];

      if (file.data) {
        baseDetails.push(`Base64 (first 120 chars): ${file.data.slice(0, 120)}...`);
      }

      return baseDetails.join('\n');
    })
    .join('\n\n---\n\n');
}

function formatFileSize(size?: number): string {
  if (!size || Number.isNaN(size)) return 'unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function summarizeScenarios(scenarios?: HighLevelTestCase[]): string {
  if (!scenarios?.length) {
    return '';
  }

  const formatted = scenarios
    .map((scenario) => [
      `ID: ${scenario.id}`,
      `Title: ${scenario.title}`,
      `Area: ${scenario.area ?? 'General'}`,
      `Scenario: ${scenario.scenario}`,
    ].join('\n'))
    .join('\n\n');

  return `Previously generated high-level scenarios to expand:\n${formatted}`;
}

export function buildTestCasePrompt(
  options: Pick<TestCaseGenerationRequest, 'requirements' | 'files' | 'selectedScenarios' | 'mode' | 'priorityMode'>
): string {
  const {
    requirements,
    files,
    selectedScenarios,
    mode,
    priorityMode = 'comprehensive'
  } = options;

  const fileSummary = summarizeFiles(files);
  const scenarioSummary = summarizeScenarios(selectedScenarios);

  const modeInstructions = mode === 'high-level'
    ? `Return high-level test scenarios. Focus on what to test, group scenarios by functional area, and avoid implementation specifics. Prioritize ${describePriority(priorityMode, true)}.`
    : `Return detailed executable test cases. Include steps, test data, preconditions, and expected results. Prioritize ${describePriority(priorityMode, false)}.`;

  const responseShape = mode === 'high-level'
    ? `Each array element must include: id, title, area, scenario.`
    : `Each array element must include: id, title, area, description, preconditions (array), testData (array), steps (array of { number, description }), expectedResult.`;

  const sections = [
    'You must produce a JSON array that matches the required schema.',
    modeInstructions,
    responseShape,
    requirements ? `Project requirements:\n${requirements}` : 'No additional written requirements were supplied.',
    fileSummary ? `Reference material extracted from uploaded files:\n${fileSummary}` : '',
    scenarioSummary,
    'Ensure the JSON is parseable and do not wrap it in markdown fences.',
  ].filter(Boolean);

  return sections.join('\n\n');
}

function describePriority(priority: TestPriorityMode, isHighLevel: boolean): string {
  if (priority === 'core-functionality') {
    return isHighLevel
      ? 'core business workflows and critical paths'
      : 'core user journeys and essential validations';
  }

  return isHighLevel
    ? 'broad coverage including edge cases'
    : 'wide coverage including negative cases';
}

export function mapModelResponseToTestCases(parsed: any[], mode: TestCaseMode): TestCase[] {
  const now = new Date();

  return parsed.map((item: any, index: number) => {
    if (mode === 'high-level') {
      return {
        id: item.id ?? `TS-${String(index + 1).padStart(3, '0')}`,
        title: item.title ?? `Scenario ${index + 1}`,
        area: item.area ?? 'General',
        scenario: item.scenario ?? item.description ?? '',
        description: '',
        createdAt: now,
      } as TestCase;
    }

    return {
      id: item.id ?? `TC-${String(index + 1).padStart(3, '0')}`,
      title: item.title ?? `Test Case ${index + 1}`,
      area: item.area ?? 'General',
      description: item.description ?? '',
      preconditions: Array.isArray(item.preconditions) ? item.preconditions : [],
      testData: Array.isArray(item.testData) ? item.testData : [],
      steps: Array.isArray(item.steps)
        ? item.steps.map((step: any, stepIndex: number) => ({
            number: typeof step?.number === 'number' ? step.number : stepIndex + 1,
            description: typeof step === 'string' ? step : step?.description ?? '',
          }))
        : [],
      expectedResult: item.expectedResult ?? '',
      createdAt: now,
    } as TestCase;
  });
}
