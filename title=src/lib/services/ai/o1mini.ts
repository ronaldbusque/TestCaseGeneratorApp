import { AIService, TestCaseGenerationRequest, TestCaseGenerationResponse } from '@/lib/types';

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
        'The JSON should be an array of objects, with each object having fields: title, description, steps (an array), and expectedResult.\n\n' +
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
              content: combinedPrompt,
            }
          ],
          max_completion_tokens: 3000, // Adjust as necessary for your use case
        }),
      });

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      // Log the raw API response
      const rawResponse = await response.clone().text();
      console.log('Raw API response:', rawResponse);

      const data = await response.json();
      console.log('Parsed API response:', data);

      // Validate response structure: allow either message.content or text field
      if (!data.choices || !data.choices[0] || (!data.choices[0].message?.content && !data.choices[0].text)) {
        throw new Error('Invalid API response structure.');
      }

      // Attempt to retrieve content from either message.content (Chat API) or text (completion API)
      const choice = data.choices[0];
      const testCasesContent = (choice.message && choice.message.content) || choice.text;
      if (!testCasesContent) {
        throw new Error('Invalid API response structure.');
      }
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
        steps: Array.isArray(tc.steps) ? tc.steps : [],
        expectedResult: tc.expectedResult || '',
        createdAt: new Date(),
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
} 