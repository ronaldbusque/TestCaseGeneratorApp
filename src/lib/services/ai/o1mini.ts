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
        numberOfFiles: request.files?.length || 0
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

      // Prepare the prompt
      const prompt = `You are a software testing expert. Generate comprehensive test cases in JSON format for the following requirements and context.

Requirements and Context:
${combinedContent}

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

IMPORTANT: 
1. Response must be a valid JSON array
2. Do not include markdown code blocks or any other formatting
3. Follow the exact structure shown above`;

      this.log('Sending request to O1-Mini API', {
        promptLength: prompt.length
      });

      this.log('Exact prompt being sent', {
        prompt,
        model: 'o1-mini'
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

        logPerformance('Test case generation', startTime, {
          totalTestCases: testCases.length,
          processedFiles: processedContents.length
        });

        return { testCases };
      } catch (error) {
        logError('Failed to parse API response', error);
        return {
          testCases: [],
          error: 'Failed to parse API response'
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