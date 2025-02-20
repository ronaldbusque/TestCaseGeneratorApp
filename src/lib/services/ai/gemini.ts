import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { AIService, TestCaseGenerationRequest, TestCaseGenerationResponse, ModelType } from '@/lib/types';

export class GeminiService implements AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private debugLog: string[] = [];

  private log(message: string, data?: any) {
    const logMessage = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    this.debugLog.push(logMessage);
    console.log(logMessage);
  }

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-01-21" });
  }

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    this.debugLog = [];
    try {
      const prompt = `You are a QA engineer. Generate test cases in JSON format for the following requirements.

Requirements:
${request.requirements}

Return ONLY a JSON array containing test cases. Each test case should have this structure:
{
  "title": "Brief test case title",
  "description": "Detailed description of what is being tested",
  "preconditions": ["List of required conditions"],
  "testData": ["List of test data items in format 'field: value'"],
  "steps": [
    {
      "number": 1,
      "description": "Step description"
    }
  ],
  "expectedResult": "Expected outcome of the test"
}

Example response format:
[
  {
    "title": "User Login - Valid Credentials",
    "description": "Verify user can login with valid username and password",
    "preconditions": [
      "User account exists in system",
      "User is not already logged in"
    ],
    "testData": [
      "Username: validuser@example.com",
      "Password: ValidPass123"
    ],
    "steps": [
      {
        "number": 1,
        "description": "Navigate to login page"
      },
      {
        "number": 2,
        "description": "Enter username and password"
      },
      {
        "number": 3,
        "description": "Click login button"
      }
    ],
    "expectedResult": "User is successfully logged in and redirected to dashboard"
  }
]

IMPORTANT: 
1. Response must be a valid JSON array
2. Do not include any explanatory text
3. Follow the exact structure shown above`;

      this.log('System Prompt', prompt);

      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 15000,
          topK: 40,
          topP: 0.8,
        }
      });

      const content = result.response.text().trim();
      this.log('Raw Response', content);

      // Try to extract JSON if there's any extra text
      const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;

      try {
        const parsedTestCases = JSON.parse(jsonContent);
        if (!Array.isArray(parsedTestCases)) {
          throw new Error('Response is not an array');
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
      } catch (error) {
        console.error('Parse error:', error);
        console.error('Content:', content);
        return {
          testCases: [],
          error: 'Failed to parse JSON response'
        };
      }
    } catch (error) {
      console.error('Generation error:', error);
      return {
        testCases: [],
        error: 'Failed to generate test cases'
      };
    }
  }

  async generateContent(prompt: string, model: ModelType): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
} 