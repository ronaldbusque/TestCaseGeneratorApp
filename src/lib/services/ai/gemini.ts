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
    } catch (error) {
      this.logError('Failed to initialize GeminiService', error);
      throw error;
    }
  }

  private async fileToGenerativePart(file: File): Promise<Part> {
    this.log('Processing file to GenerativePart', { 
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    try {
      if (file.type.startsWith('image/')) {
        this.log('Processing image file', { fileName: file.name });
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        this.log('Image file processed successfully', { 
          fileName: file.name,
          base64Length: base64Data.length 
        });
        return {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        };
      } else {
        this.log('Processing text file', { fileName: file.name });
        const text = await this.extractTextFromFile(file);
        this.log('Text file processed successfully', { 
          fileName: file.name,
          textLength: text.length 
        });
        return { text: `Content of ${file.name}:\n${text}` };
      }
    } catch (error) {
      this.logError(`Failed to process file: ${file.name}`, error);
      throw error;
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    this.log('Extracting text from file', { 
      fileName: file.name,
      fileSize: file.size 
    });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        this.log('File text extraction completed', {
          fileName: file.name,
          textLength: result.length
        });
        resolve(result);
      };
      
      reader.onerror = () => {
        const error = new Error('Failed to read file');
        this.logError(`Failed to extract text from file: ${file.name}`, error);
        reject(error);
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.log('File reading progress', {
            fileName: file.name,
            progress: `${progress}%`,
            loaded: event.loaded,
            total: event.total
          });
        }
      };

      try {
        reader.readAsText(file);
      } catch (error) {
        this.logError(`Failed to initiate file reading: ${file.name}`, error);
        reject(error);
      }
    });
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

      // Add requirements
      if (request.requirements) {
        parts.push({ text: request.requirements });
      }

      // Add selected scenarios if converting
      if (request.selectedScenarios?.length) {
        const scenariosText = request.selectedScenarios
          .map(s => `${s.title}:\n${s.scenario}`)
          .join('\n\n');
        parts.push({ text: `\n\nSelected Test Scenarios to Convert:\n${scenariosText}` });
      }

      // Process uploaded files
      if (request.files?.length) {
        const processedContents = await Promise.all(
          request.files.map(async (file) => {
            try {
              const content = await file.text();
              return {
                source: file.name,
                text: content
              };
            } catch (error) {
              console.error(`Error reading file ${file.name}:`, error);
              return null;
            }
          })
        );

        const validContents = processedContents.filter((content): content is NonNullable<typeof content> => content !== null);

        if (validContents.length > 0) {
          const filesText = validContents
            .map(content => `=== ${content.source} ===\n${content.text}`)
            .join('\n\n');
          parts.push({ text: `\n\nAdditional Context from Files:\n${filesText}` });
        }
      }

      const basePrompt = request.mode === 'high-level'
        ? `You are a seasoned QA engineer with a proven track record in uncovering critical bugs and breaking software. Your task is to generate a comprehensive set of test scenarios in JSON format based on the requirements provided below. These scenarios should explore all angles: standard functionality, edge cases, error conditions, security vulnerabilities, performance limits, and unexpected user behavior.

Each test scenario must be a concise, one-line statement that explains WHAT needs to be tested—do not include HOW to implement the test. Focus on provoking failures, ensuring robustness, and uncovering hidden issues in the software.

Requirements:
${request.requirements}

Return ONLY a JSON array of test scenarios. Each scenario should follow this structure:
{
  "title": "A short, descriptive identifier for the test case",
  "area": "The functional area or module being tested (e.g., 'Authentication', 'User Management', 'Data Validation', 'Security')",
  "scenario": "A one-line statement detailing what aspect or behavior to test, including potential edge or negative conditions"
}`
        : request.selectedScenarios
          ? `You are a QA automation expert. Your task is to convert the provided high-level test scenarios into detailed test cases. For each scenario, create a comprehensive test case that includes step-by-step instructions, preconditions, test data, and expected results.

Requirements:
${request.requirements}

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
          : `You are a QA automation expert. Your task is to generate detailed test cases based on the requirements provided. Each test case should include step-by-step instructions, preconditions, test data, and expected results.

Requirements:
${request.requirements}

Return ONLY a JSON array of detailed test cases. Each test case should follow this structure:
{
  "title": "A descriptive title for the test case",
  "area": "The functional area being tested",
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
}`;

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

      parts.push({ text: prompt });

      this.log('System Prompt', prompt);
      this.log('Complete Prompt Content', {
        parts: parts.map(part => {
          if ('text' in part) {
            return part.text;
          } else if ('inlineData' in part && part.inlineData?.mimeType) {
            return `[Binary data: ${part.inlineData.mimeType}]`;
          }
          return '[Unknown part type]';
        }).join('\n\n---\n\n')
      });
      this.log('Initiating API call to Gemini', {
        numberOfParts: parts.length,
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
            .replace(/,\s*}/g, '}'); // Remove trailing commas in objects
          
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