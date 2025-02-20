import { AIService, TestCaseGenerationRequest, TestCaseGenerationResponse, ModelType } from '@/lib/types';

export class O1MiniService implements AIService {
  private readonly API_URL = process.env.NEXT_PUBLIC_OPENAI_API_URL;
  private readonly API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    // Ensure that API_URL and API_KEY are provided
    if (!this.API_URL || !this.API_KEY) {
      return {
        testCases: [],
        error: 'API configuration is missing.',
      };
    }

    try {
      // Merge the system instructions with the user's requirements
      const combinedPrompt =
        'You are a QA engineer tasked with generating test cases. Generate comprehensive test cases in JSON format. ' +
        'The JSON should be an array of objects, with each object having fields: title, description, preconditions (array), ' +
        'testData (array of strings in format "field: value"), steps (array of objects with number and description), and expectedResult.\n\n' +
        'Example format:\n' +
        '{\n' +
        '  "title": "Login with Valid Credentials",\n' +
        '  "description": "Verify user can login with valid credentials",\n' +
        '  "preconditions": ["User exists", "System is accessible"],\n' +
        '  "testData": ["Username: valid@example.com", "Password: ValidPass123"],\n' +
        '  "steps": [{"number": 1, "description": "Navigate to login page"}],\n' +
        '  "expectedResult": "User is logged in successfully"\n' +
        '}\n\n' +
        'Requirements:\n' +
        request.requirements;

      const response = await fetch(`${this.API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: JSON.stringify({
          model: 'o1-mini',
          messages: [
            {
              role: 'user',
              content: combinedPrompt
            }
          ],
          max_completion_tokens: 15000  // Original setting
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Invalid API response structure.');
      }

      const testCasesContent = data.choices[0].message.content;
      console.log('testCasesContent:', testCasesContent);

      let parsedTestCases: any;
      try {
        parsedTestCases = JSON.parse(testCasesContent);
      } catch (parseError) {
        // If full content isn't valid JSON, attempt to extract a JSON array substring
        const jsonStart = testCasesContent.indexOf('[');
        const jsonEnd = testCasesContent.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonSubstring = testCasesContent.substring(jsonStart, jsonEnd + 1);
          try {
            parsedTestCases = JSON.parse(jsonSubstring);
          } catch (extractionError) {
            throw new Error('Failed to parse test cases JSON from API response even after extraction.');
          }
        } else {
          throw new Error('Failed to parse test cases JSON from API response.');
        }
      }

      if (!Array.isArray(parsedTestCases)) {
        throw new Error('Parsed test cases is not an array.');
      }

      const testCases = parsedTestCases.map((tc: any, index: number) => ({
        id: `TC-${String(index + 1).padStart(3, '0')}`,
        title: tc.title || `Test Case ${index + 1}`,
        description: tc.description || '',
        preconditions: tc.preconditions || [],
        testData: tc.testData || [],
        steps: Array.isArray(tc.steps) 
          ? tc.steps.map((step: any, stepIndex: number) => ({
              number: stepIndex + 1,
              description: typeof step === 'string' ? step : step.description || ''
            }))
          : [],
        expectedResult: tc.expectedResult || '',
        createdAt: new Date()
      }));

      return { testCases };
    } catch (error: any) {
      console.error('Error generating test cases:', error);
      return {
        testCases: [],
        error: error.message || 'Failed to generate test cases. Please try again.',
      };
    }
  }

  async generateContent(prompt: string, model: ModelType): Promise<string> {
    throw new Error('Method not implemented.');
  }
} 