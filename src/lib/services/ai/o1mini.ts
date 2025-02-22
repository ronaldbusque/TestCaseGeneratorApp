import { AIService, TestCaseGenerationRequest, TestCaseGenerationResponse, ModelType } from '@/lib/types';
import { ImageProcessor } from '../imageProcessor';
import { parseDocument } from '../documentParser';
import { logError, logInfo, logPerformance } from '@/lib/utils/logging';

interface ProcessedContent {
  text: string;
  source: string;
  metadata: Record<string, any>;
}

export class O1MiniService implements AIService {
  private imageProcessor: ImageProcessor;
  private debugLog: string[] = [];

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  private log(message: string, data?: any) {
    const logMessage = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    this.debugLog.push(logMessage);
    logInfo(message, data);
  }

  private cleanJsonResponse(content: string): string {
    this.log('Cleaning JSON response', {
      originalLength: content.length
    });

    // Remove markdown code block if present
    let cleanContent = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim();
      this.log('Extracted JSON from code block', {
        extractedLength: cleanContent.length
      });
    }

    // Ensure the content starts with [ and ends with ]
    const arrayMatch = cleanContent.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!arrayMatch) {
      throw new Error('Response does not contain a valid JSON array');
    }

    return cleanContent;
  }

  private async callO1MiniAPI(prompt: string): Promise<string> {
    const apiUrl = process.env.NEXT_PUBLIC_OPENAI_API_URL;
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const model = 'o1-mini';

    if (!apiUrl || !apiKey) {
      const error = new Error('O1-Mini API configuration is missing');
      logError('API configuration error', error);
      throw error;
    }

    try {
      this.log('Preparing API request', {
        apiUrl,
        model,
        promptLength: prompt.length
      });

      const requestBody = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 15000
      };

      this.log('API request configuration', {
        model,
        max_completion_tokens: requestBody.max_completion_tokens,
        messageCount: requestBody.messages.length
      });

      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response structure');
      }

      const rawContent = data.choices[0].message.content;
      const content = this.cleanJsonResponse(rawContent);
      
      this.log('API request completed successfully', {
        model,
        responseLength: content.length,
        firstChars: content.substring(0, 100) + '...',
        usage: data.usage || 'Not provided'
      });

      return content;
    } catch (error) {
      logError('API request failed', error, { model });
      throw error;
    }
  }

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    const startTime = Date.now();
    this.debugLog = [];

    try {
      this.log('Starting test case generation', {
        requirementsLength: request.requirements.length,
        numberOfFiles: request.files?.length || 0,
        mode: request.mode
      });

      // Process all files first
      const processedContents: ProcessedContent[] = [];
      
      if (request.files && request.files.length > 0) {
        this.log('Processing input files', { fileCount: request.files.length });
        
        for (const file of request.files) {
          const startFileTime = Date.now();
          try {
            if (file.type.startsWith('image/')) {
              const result = await this.imageProcessor.processImage(file);
              processedContents.push({
                text: result.text,
                source: `Image: ${file.name}`,
                metadata: result.metadata
              });
            } else {
              const result = await parseDocument(file, { preserveStructure: true });
              processedContents.push({
                text: result.content,
                source: `Document: ${file.name}`,
                metadata: result.metadata
              });
            }
            logPerformance(`Processed ${file.name}`, startFileTime);
          } catch (error) {
            logError(`Failed to process file: ${file.name}`, error);
            throw new Error(`Failed to process file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        this.log('Files processed successfully', { processedCount: processedContents.length });
      }

      // Combine all content into a unified context
      let combinedContent = request.requirements;
      if (processedContents.length > 0) {
        combinedContent += '\n\nAdditional Context from Files:\n\n' + 
          processedContents.map(pc => `=== ${pc.source} ===\n${pc.text}`).join('\n\n');
      }

      this.log('Combined content prepared', {
        totalLength: combinedContent.length,
        sources: processedContents.map(pc => pc.source)
      });

      // Prepare the prompt based on mode
      const basePrompt = request.mode === 'high-level'
        ? `You are a seasoned QA engineer with a proven track record in uncovering critical bugs and breaking software. Your task is to generate a comprehensive set of test scenarios in JSON format based on the requirements provided below. These scenarios should explore all angles: standard functionality, edge cases, error conditions, security vulnerabilities, performance limits, and unexpected user behavior.

Each test scenario must be a concise, one-line statement that explains WHAT needs to be tested—do not include HOW to implement the test. Focus on provoking failures, ensuring robustness, and uncovering hidden issues in the software.

Requirements:
${combinedContent}

Return ONLY a JSON array of test scenarios. Each scenario should follow this structure:
{
  "title": "A short, descriptive identifier for the test case",
  "area": "The functional area or module being tested (e.g., 'Authentication', 'User Management', 'Data Validation', 'Security')",
  "scenario": "A one-line statement detailing what aspect or behavior to test, including potential edge or negative conditions"
}

Consider including, but not limited to, scenarios that test:
- Valid and invalid inputs (e.g., boundary values, out-of-range values)
- Error handling and response to unexpected user actions
- Data integrity and state management under stress
- Security threats such as injection attacks, cross-site scripting, and unauthorized access
- Concurrency, race conditions, and performance limits

Example:
[
  {
    "title": "SQL Injection in Login",
    "area": "Authentication",
    "scenario": "Test the login functionality for SQL injection vulnerabilities by providing malicious input"
  },
  {
    "title": "Invalid Email Registration",
    "area": "User Registration",
    "scenario": "Ensure that the system rejects registrations with improperly formatted email addresses"
  }
]`
        : `You are a meticulous software testing expert with years of experience in creating detailed, bulletproof test cases. Your mission is to generate comprehensive test cases that leave no stone unturned, ensuring thorough validation of functionality, edge cases, and potential failure points.

Your test cases should be detailed enough that any QA engineer can execute them consistently and reliably. While high-level scenarios focus on WHAT to test, your detailed test cases must specify exactly HOW to test it, including precise steps, test data, and expected outcomes. Focus on creating test cases that:
- Thoroughly validate core functionality
- Handle edge cases and boundary conditions
- Account for various user roles and permissions
- Consider system states and data conditions
- Verify error handling and recovery
- Test integration points and data flow

Requirements:
${combinedContent}

Return ONLY a JSON array containing test cases. Each test case should have this structure:
{
  "title": "Brief test case title",
  "area": "Functional area or module (e.g., 'Login', 'User Management', 'Security')",
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

Example:
[
  {
    "title": "Login with Valid Credentials",
    "area": "Authentication",
    "description": "Verify that users can successfully log in with valid credentials",
    "preconditions": ["User account exists", "User is not logged in"],
    "testData": ["username: validUser", "password: validPass123"],
    "steps": [
      {
        "number": 1,
        "description": "Navigate to login page"
      },
      {
        "number": 2,
        "description": "Enter valid username and password"
      },
      {
        "number": 3,
        "description": "Click login button"
      }
    ],
    "expectedResult": "User is successfully logged in and redirected to dashboard"
  }
]`;

      const modeSpecificInstructions = request.mode === 'high-level'
        ? `\n\nFor test scenarios:
- Keep scenarios concise and focused on WHAT, not HOW
- Each scenario should be a single, clear statement
- Group scenarios by functional area
- Focus on business requirements and user workflows
- Avoid implementation details or specific steps`
        : `\n\nFor detailed test cases:
- Include specific step-by-step instructions
- Add detailed test data
- Cover edge cases and specific scenarios
- Include validation steps`;

      const prompt = basePrompt + modeSpecificInstructions + `\n\nIMPORTANT:
1. Response must be a valid JSON array
2. Do not include any explanatory text
3. Follow the exact structure shown above`;

      this.log('Sending request to O1-Mini API', {
        promptLength: prompt.length,
        mode: request.mode
      });

      const response = await this.callO1MiniAPI(prompt);

      try {
        const parsedTestCases = JSON.parse(response);
        if (!Array.isArray(parsedTestCases)) {
          throw new Error('Response is not an array');
        }

        this.log('Successfully parsed JSON response', {
          numberOfTestCases: parsedTestCases.length
        });

        const testCases = parsedTestCases.map((tc: any, index: number) => {
          if (request.mode === 'high-level') {
            return {
              id: `TS-${String(index + 1).padStart(3, '0')}`,  // TS for Test Scenario
              title: tc.title || `Scenario ${index + 1}`,
              area: tc.area || 'General',
              scenario: tc.scenario || tc.description || '',  // Fallback to description if scenario not provided
              description: '',  // Not needed for scenarios
              createdAt: new Date()
            };
          }

          return {
            id: `TC-${String(index + 1).padStart(3, '0')}`,
            title: tc.title || `Test Case ${index + 1}`,
            area: tc.area || 'General',  // Add area field for detailed test cases
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
          };
        });

        logPerformance('Test case generation', startTime, {
          totalTestCases: testCases.length,
          processedFiles: processedContents.length
        });

        return { testCases };
      } catch (error) {
        logError('Failed to parse API response', error);
        return {
          testCases: [],
          error: 'Failed to parse JSON response'
        };
      }
    } catch (error) {
      logError('Test case generation failed', error);
      return {
        testCases: [],
        error: 'Failed to generate test cases'
      };
    } finally {
      // Cleanup
      await this.imageProcessor.terminate();
    }
  }

  async generateContent(prompt: string, model: ModelType): Promise<string> {
    this.log('Starting content generation', {
      promptLength: prompt.length,
      modelType: model
    });

    try {
      const response = await this.callO1MiniAPI(prompt);
      this.log('Content generation completed', {
        responseLength: response.length
      });
      return response;
    } catch (error) {
      logError('Content generation failed', error);
      throw error;
    }
  }
} 