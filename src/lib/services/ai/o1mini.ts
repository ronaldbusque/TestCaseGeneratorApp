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
    // Test the JSON cleaning fix
    this.testJsonCleaning();
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

    // Remove any BOM or invalid control characters
    cleanContent = cleanContent
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\r?\n/g, ' ') // Normalize line endings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Replace dynamic string generation expressions with literal strings
    cleanContent = cleanContent
      // Handle any dynamic expressions combining literal strings with .repeat calls
      .replace(/\"([^\"]+)\"\s*\+\s*(?:\")?([A-Za-z0-9]+)(?:\")?\.repeat\((\d+)\)/g, (match, prefix, char, count) => {
        const repeatedStr = char.repeat(parseInt(count, 10));
        return `"${prefix}${repeatedStr}"`;
      })
      // Handle string concatenations with @ symbol or other special characters
      .replace(/\"([^\"]+)\"\s*\+\s*\"([^\"]+)\"/g, (match, part1, part2) => {
        return `"${part1}${part2}"`;
      })
      // Handle other dynamic string concatenations in arrays or direct properties
      .replace(/\"([^\"]+)\"\s*\+\s*([^,\]}\"]+)/g, (match, prefix, expr) => {
        try {
          // Skip if it's already been handled by previous replacements
          if (match.includes('.repeat(') || (prefix && !expr)) {
            return match;
          }
          const evalResult = eval(expr.trim());
          return `"${prefix}${evalResult}"`;
        } catch {
          const defaultValue = "Dynamic content generation failed";
          return `"${prefix}${defaultValue}"`;
        }
      });

    // Log the content after string replacements for debugging
    this.log('Content after string replacements', {
      contentStart: cleanContent.substring(0, 100),
      contentEnd: cleanContent.substring(cleanContent.length - 100)
    });

    // Ensure the content starts with [ and ends with ]
    const arrayMatch = cleanContent.match(/^\s*\[[\s\S]*\]\s*$/);
    if (!arrayMatch) {
      this.log('Invalid JSON array structure', {
        startsWithBracket: cleanContent.trim().startsWith('['),
        endsWithBracket: cleanContent.trim().endsWith(']'),
        firstChar: cleanContent.trim()[0],
        lastChar: cleanContent.trim()[cleanContent.length - 1],
        contentPreview: cleanContent.substring(0, 200) + '...'
      });
      throw new Error('Response does not contain a valid JSON array');
    }

    // Validate JSON structure
    try {
      JSON.parse(cleanContent);
    } catch (error: any) {
      this.log('JSON parsing failed', { 
        error: error.message, 
        position: error.message.match(/position (\d+)/)?.[1] || 'unknown',
        nearbyContent: error.message.includes('position') 
          ? cleanContent.substring(
              Math.max(0, parseInt(error.message.match(/position (\d+)/)[1]) - 50),
              Math.min(cleanContent.length, parseInt(error.message.match(/position (\d+)/)[1]) + 50)
            )
          : 'position not found in error',
        content: cleanContent 
      });
      throw new Error(`Invalid JSON structure: ${error.message}`);
    }

    return cleanContent;
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
    // Test cases for different JSON cleaning scenarios
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
      // Additional test cases from Gemini service
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
        const cleaned = this.cleanJsonString(
          testCase.input
            .replace(/^\uFEFF/, '') // Remove BOM
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\r?\n/g, ' ') // Normalize line endings
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
        );
        const parsed = JSON.parse(cleaned);
        this.log(`Test successful - ${testCase.name}`, {
          cleaned,
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

    return allTestsPassed;
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
        max_completion_tokens: 20000
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
    let combinedContent = request.requirements;

    this.log('Starting test case generation', {
      mode: request.mode,
      requirementsLength: request.requirements.length,
      numberOfFiles: request.files?.length || 0,
      selectedScenarios: request.selectedScenarios?.length || 0
    });

    try {
      // Process uploaded files
      const processedContents: { source: string; text: string; }[] = [];
      
      if (request.files?.length) {
        for (const file of request.files) {
          try {
            if (file.type.startsWith('image/')) {
              // Process image files using OCR
              const result = await this.imageProcessor.processImage(file);
              processedContents.push({
                source: file.name,
                text: `Image Analysis (${file.name}):\n${result.text}\n\nConfidence: ${result.confidence.toFixed(2)}%\nDimensions: ${result.metadata.width}x${result.metadata.height}`
              });
            } else {
              // Process document files
              const result = await parseDocument(file);
              processedContents.push({
                source: file.name,
                text: result.content
              });
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        }
      }

      // Add selected scenarios if converting
      if (request.selectedScenarios?.length) {
        combinedContent += '\n\nSelected Test Scenarios to Convert:\n' +
          request.selectedScenarios.map(s => `${s.title}:\n${s.scenario}`).join('\n\n');
      }
      
      // Filter out any processed content that's already in the requirements
      const uniqueProcessedContents = processedContents.filter(pc => {
        // Skip if the content is already in the requirements
        if (combinedContent.includes(pc.text.trim())) {
          this.log('Skipping duplicate content', {
            source: pc.source,
            reason: 'Content already exists in requirements'
          });
          return false;
        }
        return true;
      });
      
      // Remove any "Image Files for Testing:" section from requirements
      combinedContent = combinedContent.replace(/\nImage Files for Testing:[\s\S]*?(?=\n\n|$)/, '');
      
      if (uniqueProcessedContents.length > 0) {
        combinedContent += '\n\nAdditional Requirements and/or Context from Files:\n\n' + 
          uniqueProcessedContents.map(pc => `=== ${pc.source} ===\n${pc.text}`).join('\n\n');
      }

      this.log('Combined content prepared', {
        totalLength: combinedContent.length,
        sources: uniqueProcessedContents.map(pc => pc.source)
      });

      // Prepare the prompt based on mode
      const basePrompt = request.mode === 'high-level'
        ? `You are a seasoned QA engineer with a proven track record in uncovering critical bugs and breaking software. Your task is to generate a ${request.priorityMode === 'comprehensive' ? 'comprehensive' : 'focused'} set of test scenarios in JSON format based on the requirements provided below. ${
          request.priorityMode === 'comprehensive'
            ? 'These scenarios should explore all angles: standard functionality, edge cases, error conditions, and unexpected user behavior.'
            : 'Focus on core functionality and critical path testing, prioritizing the most important user workflows and basic error handling.'
          }

Each test scenario must be a concise, one-line statement that explains WHAT needs to be tested—do not include HOW to implement the test. ${
  request.priorityMode === 'comprehensive'
    ? 'Focus on provoking failures, ensuring robustness, and uncovering hidden issues in the software.'
    : 'Focus on validating the most critical functionality and basic error cases.'
}

Requirements:
${combinedContent}

Return ONLY a JSON array of test scenarios. Each scenario should follow this structure:
{
  "title": "A short, descriptive identifier for the test case",
  "area": "The functional area or module being tested (e.g., 'Authentication', 'User Management', 'Data Validation', 'Security')",
  "scenario": "A one-line statement detailing what aspect or behavior to test, including potential edge or negative conditions"
}`
        : request.selectedScenarios?.length
          ? `You are a meticulous software testing expert with years of experience in creating detailed, bulletproof test cases. Your task is to convert the provided high-level test scenarios into detailed test cases. For each scenario, create a comprehensive test case that includes step-by-step instructions, preconditions, test data, and expected results.

Requirements:
${combinedContent}

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
3. Follow the exact structure shown above
${request.priorityMode === 'core-functionality' ? '4. Remember to focus only on core functionality and critical paths, avoiding edge cases and complex scenarios' : ''}`;

      this.log('Sending request to O1-Mini API', {
        promptLength: prompt.length,
        mode: request.mode,
        priorityMode: request.priorityMode || 'comprehensive'
      });

      this.log('Complete Prompt Content', {
        requirements: request.requirements,
        selectedScenarios: request.selectedScenarios?.map(s => `${s.title}:\n${s.scenario}`).join('\n\n'),
        additionalFiles: processedContents.map(pc => `=== ${pc.source} ===\n${pc.text}`).join('\n\n'),
        finalPrompt: prompt,
        mode: request.mode,
        priorityMode: request.priorityMode || 'comprehensive'
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