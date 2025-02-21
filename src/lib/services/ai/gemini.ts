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
      requirementsLength: request.requirements.length,
      numberOfFiles: request.files?.length || 0
    });
    
    this.debugLog = [];
    try {
      const parts: Part[] = [];

      // Add files if present
      if (request.files && request.files.length > 0) {
        this.log('Processing input files', { fileCount: request.files.length });
        const fileParts = await Promise.all(request.files.map(file => this.fileToGenerativePart(file)));
        parts.push(...fileParts);
        this.log('Files processed successfully', { processedCount: fileParts.length });
      }

      // Add the requirements prompt
      const prompt = `You are a QA engineer. Generate test cases in JSON format for the following requirements and any provided files.

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

For any images provided:
- Include visual verification steps
- Add accessibility test cases if applicable
- Include responsive design test cases
- Add cross-browser compatibility test cases

IMPORTANT: 
1. Response must be a valid JSON array
2. Do not include any explanatory text
3. Follow the exact structure shown above`;

      parts.push({ text: prompt });

      this.log('System Prompt', prompt);
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
          maxOutputTokens: 15000,
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
        const parsedTestCases = JSON.parse(jsonContent);
        if (!Array.isArray(parsedTestCases)) {
          const error = new Error('Response is not an array');
          this.logError('JSON parsing validation failed', error);
          throw error;
        }

        this.log('Successfully parsed JSON response', {
          numberOfTestCases: parsedTestCases.length
        });

        const testCases = parsedTestCases.map((tc: any, index: number) => {
          const processedCase = {
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
          };

          this.log(`Processed test case ${index + 1}`, {
            id: processedCase.id,
            title: processedCase.title,
            stepsCount: processedCase.steps.length
          });

          return processedCase;
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
        maxOutputTokens: 8000
      });

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
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