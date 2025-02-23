import { GoogleGenerativeAI, GenerativeModel, Part } from "@google/generative-ai";
import { AIService, TestCaseGenerationRequest, TestCaseGenerationResponse, ModelType } from '@/lib/types';

export class GeminiService implements AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private debugLog: string[] = [];

  private log(message: string, data?: any) {
    const logMessage = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    this.debugLog.push(logMessage);
    console.log(`[GeminiService] ${logMessage}`);
  }

  private logError(message: string, error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      ...(error.response && { response: error.response }),
    };
    this.debugLog.push(`ERROR - ${message}: ${JSON.stringify(errorDetails, null, 2)}`);
    console.error(`[GeminiService] ERROR - ${message}:`, errorDetails);
  }

  constructor() {
    this.log('Initializing GeminiService');
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      this.logError('API Key Missing', new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured'));
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
    }
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-01-21" });
      this.log('GeminiService initialized successfully');
      this.testJsonCleaning();
    } catch (error) {
      this.logError('Failed to initialize GeminiService', error);
      throw error;
    }
  }

  private cleanJsonString(jsonContent: string): string {
    // This regex matches JSON string literals
    const stringLiteralPattern = /"((?:\\.|[^"\\])*?)"/g;
    
    return jsonContent.replace(stringLiteralPattern, (match, capturedString) => {
      try {
        // First try to parse any existing escape sequences
        const decoded = JSON.parse('"' + capturedString + '"');
        // Re-encode to ensure proper escaping
        return JSON.stringify(decoded);
      } catch {
        // If parsing fails, try to clean the string manually
        const cleaned = capturedString
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/"/g, '\\"')    // Then escape quotes
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control chars
        return `"${cleaned}"`;
      }
    });
  }

  private testJsonCleaning() {
    const testCases = [
      // Original O1-Mini test cases
      {
        name: 'Repeating characters test',
        input: `[{"title":"Create Task with Maximum Title Length","area":"Task Management","description":"Verify that the system accepts a task title up to the maximum allowed length.","preconditions":["User is logged in","User navigates to Task Management module"],"testData":["title: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","description: Max length title test.","due date: 2024-07-01","priority: Medium"],"steps":[{"number":1,"description":"Navigate to the Task Management module."}],"expectedResult":"Task is created successfully with the 255-character title."}]`
      },
      {
        name: 'Email concatenation test',
        input: `[{"title":"Boundary Condition: Maximum Allowed Email Length","area":"Registration","description":"Verify that the system accepts emails with maximum allowed length.","preconditions":["No existing user with the test email"],"testData":["email: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com","password: Boundary1"],"steps":[{"number":1,"description":"Navigate to the registration page."}],"expectedResult":"Registration succeeds with maximum length email."}]`
      },
      {
        name: 'Password repeat test',
        input: `[{"title":"Boundary Condition: Password with Maximum Length","area":"Registration","description":"Test maximum password length.","preconditions":["System is ready"],"testData":["email: test@example.com","password: A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1"],"steps":[{"number":1,"description":"Enter test data."}],"expectedResult":"Password accepted."}]`
      },
      // Existing Gemini test cases
      {
        name: 'Special characters test',
        input: `[{"title":"Test with Special Characters","area":"Task Management","description":"Test special characters handling","testData":["title: Task with special chars: !@#$%^&*()_+-=","description: Testing special chars"],"steps":[{"number":1,"description":"Enter special characters"}],"expectedResult":"Task created with special characters"}]`
      },
      {
        name: 'Unescaped backslash test',
        input: `[{"title":"Test with Unescaped Backslashes","area":"Input Validation","description":"Test backslash handling","testData":["path: C:\\\\Program Files\\\\App","regex: \\\\w+\\\\s+\\\\d+"],"steps":[{"number":1,"description":"Enter path with backslashes"}],"expectedResult":"Path accepted"}]`
      },
      {
        name: 'Nested quotes test',
        input: `[{"title":"Test with Nested Quotes","area":"Validation","description":"Test nested quote handling","testData":["input: \\"quoted text\\"","description: 'single quoted'"],"steps":[{"number":1,"description":"Enter quoted text"}],"expectedResult":"Text with quotes accepted"}]`
      },
      {
        name: 'Backslash escaping test',
        input: `[{"title":"Test with Backslashes","area":"Input Validation","description":"Test backslash handling","testData":["path: C:\\\\Program Files\\\\App","regex: \\\\w+\\\\s+\\\\d+"],"steps":[{"number":1,"description":"Enter path with backslashes"}],"expectedResult":"Path accepted with proper escaping"}]`
      },
      // New test case for complex string literals
      {
        name: 'Complex string literals test',
        input: `[{"title":"Test with Complex Characters","area":"String Handling","description":"Test complex string literal handling","testData":["path: C:\\\\Complex\\\\Path\\\\Here","input: Task with !@#$%^&*()_+-=\\u0060~[]\\\\{}|;':\\",./<>? chars","regex: \\\\w+\\\\s+\\\\d+"],"steps":[{"number":1,"description":"Enter 'C:\\\\Program Files\\\\App' in path"}],"expectedResult":"All characters handled correctly"}]`
      }
    ];

    let allTestsPassed = true;
    
    for (const testCase of testCases) {
      try {
        // Try to parse the input directly first to ensure it's valid JSON
        const initialParsed = JSON.parse(testCase.input);
        
        // Extract JSON and clean it
        const jsonMatch = testCase.input.match(/\[\s*{[\s\S]*}\s*\]/);
        const jsonContent = jsonMatch ? jsonMatch[0] : testCase.input;
        
        // Apply cleaning rules including the new string literal cleaning
        const cleanedContent = this.cleanJsonString(
          jsonContent
            .replace(/^\uFEFF/, '') // Remove BOM
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\r?\n/g, ' ') // Normalize line endings
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
        );

        // Try to parse the cleaned content
        const parsed = JSON.parse(cleanedContent);
        
        this.log(`Test successful - ${testCase.name}`, {
          original: testCase.input,
          cleaned: cleanedContent,
          parsed: parsed[0].testData
        });
      } catch (error: any) {
        this.log(`Test failed - ${testCase.name}`, {
          error: error.message,
          problematicPart: testCase.input.substring(
            Math.max(0, error.message.indexOf('position') - 50),
            Math.min(testCase.input.length, error.message.indexOf('position') + 50)
          )
        });
        allTestsPassed = false;
      }
    }

    if (allTestsPassed) {
      this.log('All JSON cleaning tests passed successfully');
    } else {
      this.log('Some JSON cleaning tests failed');
    }
    
    return allTestsPassed;
  }

  private async fileToGenerativePart(file: File): Promise<Part> {
    this.log('Processing file to GenerativePart', { 
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    try {
      // Convert file to base64 regardless of type
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      
      this.log('File processed successfully', { 
        fileName: file.name,
        fileType: file.type,
        base64Length: base64Data.length 
      });

      // Let Gemini handle both image and text files natively
      return {
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      };
    } catch (error) {
      this.logError(`Failed to process file: ${file.name}`, error);
      throw error;
    }
  }

  async generateTestCases(request: TestCaseGenerationRequest): Promise<TestCaseGenerationResponse> {
    this.log('Starting test case generation', {
      mode: request.mode,
      requirementsLength: request.requirements.length,
      numberOfFiles: request.files?.length || 0,
      selectedScenarios: request.selectedScenarios?.length || 0
    });

    this.debugLog = [];
    try {
      const parts: Part[] = [];

      // Process uploaded files first using Gemini's native multimodal capabilities
      if (request.files?.length) {
        this.log('Processing files for Gemini API', {
          numberOfFiles: request.files.length,
          fileTypes: request.files.map(f => f.type)
        });

        const fileParts = await Promise.all(
          request.files.map(async file => {
            try {
              return await this.fileToGenerativePart(file);
            } catch (error) {
              this.logError(`Error processing file ${file.name}`, error);
              return null;
            }
          })
        );

        // Add valid file parts to the parts array
        parts.push(...fileParts.filter((part): part is Part => part !== null));
      }

      // Only add requirements if they're not already included in a text file
      const hasTextFile = request.files?.some(file => file.type === 'text/plain' || file.type === 'text/markdown');
      if (!hasTextFile && request.requirements) {
        parts.push({ text: request.requirements });
      }

      // Add selected scenarios if converting
      if (request.selectedScenarios?.length) {
        const scenariosText = request.selectedScenarios
          .map(s => `${s.title}:\n${s.scenario}`)
          .join('\n\n');
        parts.push({ text: `\n\nSelected Test Scenarios to Convert:\n${scenariosText}` });
      }

      const basePrompt = request.mode === 'high-level'
        ? `You are a seasoned QA engineer with a proven track record in uncovering critical bugs and breaking software. Your task is to generate a ${request.priorityMode === 'comprehensive' ? 'comprehensive' : 'focused'} set of test scenarios in JSON format based on the requirements provided. ${
          request.priorityMode === 'comprehensive' 
            ? 'These scenarios should explore all angles: standard functionality, edge cases, error conditions, and unexpected user behavior.'
            : 'Focus on core functionality and critical path testing, prioritizing the most important user workflows and basic error handling.'
          }

Ensure that contents of uploaded images and text files are covered in the test scenarios when applicable. Each test scenario must be a concise, one-line statement that explains WHAT needs to be tested—do not include HOW to implement the test. ${
  request.priorityMode === 'comprehensive'
    ? 'Focus on provoking failures, ensuring robustness, and uncovering hidden issues in the software.'
    : 'Focus on validating the most critical functionality and basic error cases.'
}

Return ONLY a JSON array of test scenarios. Each scenario should follow this structure:
{
  "title": "A short, descriptive identifier for the test case",
  "area": "The functional area or module being tested (e.g., 'Authentication', 'User Management', 'Data Validation', 'Security')",
  "scenario": "A one-line statement detailing what aspect or behavior to test, including potential edge or negative conditions"
}`
        : request.selectedScenarios?.length
          ? `You are a meticulous software testing expert with years of experience in creating detailed, bulletproof test cases. Your task is to convert the provided high-level test scenarios into detailed test cases. For each scenario, create a comprehensive test case that includes step-by-step instructions, preconditions, test data, and expected results.

Selected Test Scenarios to Convert:
${request.selectedScenarios.map(s => `${s.title} (Area: ${s.area}):\n${s.scenario}`).join('\n\n')}

Return ONLY a JSON array of detailed test cases. Each test case should follow this structure:
{
  "title": "A descriptive title for the test case",
  "area": "The functional area being tested (IMPORTANT: Use the exact area from the original scenario)",
  "description": "A detailed description of what this test case verifies",
  "preconditions": ["List of conditions that must be met before test execution"],
  "testData": ["List of test data required for the test"],
  "steps": [
    {
      "number": 1,
      "description": "Step-by-step instruction"
    }
  ],
  "expectedResult": "The expected outcome after executing all steps"
}

IMPORTANT: Each converted test case must maintain the same functional area as its original scenario.`
          : `You are a meticulous software testing expert with years of experience in creating detailed, bulletproof test cases. Your task is to generate ${
            request.priorityMode === 'comprehensive' ? 'comprehensive' : 'focused'
          } test cases that ${
            request.priorityMode === 'comprehensive'
              ? 'thoroughly validate all aspects of the system'
              : 'validate core functionality and critical paths'
          }. Your test cases should be detailed enough that any QA engineer can execute them consistently and reliably.

While high-level scenarios focus on WHAT to test, your detailed test cases must specify exactly HOW to test it, including precise steps, test data, and expected outcomes. Focus on creating test cases that:
${request.priorityMode === 'comprehensive' 
  ? `- Thoroughly validate core functionality
- Handle edge cases and boundary conditions
- Account for various user roles and permissions
- Consider system states and data conditions
- Verify error handling and recovery
- Test integration points and data flow`
  : `- Validate core functionality and critical paths
- Handle basic error conditions
- Test primary user roles and permissions
- Verify essential system states
- Test basic integration points`
}

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
}`;

      const modeSpecificInstructions = request.mode === 'high-level' 
        ? `\n\nFor test scenarios:
- Keep scenarios concise and focused on WHAT, not HOW
- Each scenario should be a single, clear statement
- Group scenarios by functional area
- Focus on ${request.priorityMode === 'comprehensive' ? 'business requirements and user workflows' : 'core functionality and critical paths'}
- ${request.priorityMode === 'comprehensive' ? 'Include edge cases and error conditions' : 'Focus on basic error handling'}`
        : `\n\nFor detailed test cases:
- Include specific step-by-step instructions
- Add detailed test data
- ${request.priorityMode === 'comprehensive' ? 'Cover edge cases and specific scenarios' : 'Focus on core functionality'}
- Include validation steps`;

      const prompt = basePrompt + modeSpecificInstructions + `\n\nIMPORTANT: 
1. Response must be a valid JSON array
2. Do not include any explanatory text
3. Follow the exact structure shown above`;

      parts.push({ text: prompt });

      this.log('System Prompt', prompt);
      this.log('Complete Prompt Content', {
        parts: parts.map(part => {
          if ('text' in part) {
            return part.text;
          } else if ('inlineData' in part && part.inlineData?.mimeType) {
            return `[${part.inlineData.mimeType} data]`;
          }
          return '[Unknown part type]';
        })
      });
      
      this.log('Initiating API call to Gemini', {
        numberOfParts: parts.length,
        partTypes: parts.map(part => {
          if ('text' in part) return 'text';
          if ('inlineData' in part && part.inlineData?.mimeType) return part.inlineData.mimeType;
          return 'unknown';
        }),
        promptLength: prompt.length
      });

      const result = await this.model.generateContent({
        contents: [{
          role: 'user',
          parts
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 20000,
          topK: 40,
          topP: 0.8,
        }
      });

      const content = result.response.text().trim();
      this.log('Raw API Response', {
        responseLength: content.length,
        firstChars: content.substring(0, 100) + '...'
      });

      // Try to extract JSON if there's any extra text
      const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
      const jsonContent = jsonMatch ? jsonMatch[0] : content;
      this.log('JSON extraction result', {
        wasJsonExtracted: !!jsonMatch,
        extractedLength: jsonContent.length
      });

      try {
        let parsedTestCases;
        try {
          parsedTestCases = JSON.parse(jsonContent);
        } catch (parseError) {
          // Try to fix common JSON issues
          const cleanedContent = jsonContent
            .replace(/\n/g, ' ')  // Remove newlines
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/,\s*]/g, ']') // Remove trailing commas
            .replace(/,\s*}/g, '}') // Remove trailing commas in objects
            // Escape special characters in strings
            .replace(/(?<!\\)(["\[\]{}|;':<>])/g, '\\$1')
            // Fix escaped quotes and backslashes
            .replace(/\\+"/g, '\\"')
            .replace(/\\+\\/g, '\\\\')
            // Clean up any double-escaped characters
            .replace(/\\\\(["\\/bfnrt])/g, '\\$1');
          
          try {
            parsedTestCases = JSON.parse(cleanedContent);
          } catch (secondError) {
            // If still can't parse, try to extract the valid portion
            const validMatch = cleanedContent.match(/\[\s*{[^]*?}\s*\]/);
            if (validMatch) {
              parsedTestCases = JSON.parse(validMatch[0]);
            } else {
              throw parseError; // Throw original error if all attempts fail
            }
          }
        }

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

        this.log('Test case generation completed successfully', {
          totalTestCases: testCases.length
        });

        return { testCases };
      } catch (error) {
        this.logError('Failed to parse JSON response', error);
        console.error('Content:', content);
        return {
          testCases: [],
          error: 'Failed to parse JSON response'
        };
      }
    } catch (error) {
      this.logError('Test case generation failed', error);
      return {
        testCases: [],
        error: 'Failed to generate test cases'
      };
    }
  }

  async generateContent(prompt: string, model: ModelType): Promise<string> {
    this.log('Starting content generation', {
      promptLength: prompt.length,
      modelType: model
    });

    try {
      this.log('Initiating API call to Gemini', {
        temperature: 0.7,
        maxOutputTokens: 20000
      });

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 20000,
        }
      });

      const response = result.response.text();
      this.log('Content generation completed successfully', {
        responseLength: response.length,
        firstChars: response.substring(0, 100) + '...'
      });

      return response;
    } catch (error: any) {
      this.logError('Content generation failed', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
} 