import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/services/ai/factory';
import { extractFullTextFromFiles } from '@/lib/server/fileTextExtraction';
import { TestCaseGenerationRequest, UploadedFilePayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Test case generation endpoint called');
    
    const body = await request.json();
    const {
      requirements,
      mode,
      priorityMode,
      selectedScenarios,
      fileContent,
      files = [],
      provider,
      model,
      agenticOptions,
    } = body as TestCaseGenerationRequest & {
      fileContent?: string;
      files?: UploadedFilePayload[];
    };
    
    // Get the user identifier from the headers (added by middleware)
    const userIdentifier = request.headers.get('X-User-Identifier');
    console.log(`[API] User identifier from middleware: ${userIdentifier}`);
    
    // Log safely without exposing the entire content of requirements or fileContent
    console.log(`[API] Request details - Mode: ${mode}, Provider: ${provider ?? 'openai'}, Model: ${model ?? 'default'}, Requirements: ${requirements ? `${requirements.substring(0, 50)}...` : 'None'}, File content: ${fileContent ? 'Provided' : 'None'}, Files: ${files.length}`);
    
    const hasFiles = Array.isArray(files) && files.length > 0;

    if (!requirements && !fileContent && !hasFiles && !selectedScenarios?.length) {
      return NextResponse.json(
        { error: 'Missing requirements or scenarios' },
        { status: 400 }
      );
    }

    const { enrichedFiles, combinedText } = await extractFullTextFromFiles(files);

    const aiService = createAIService(provider);
    console.log(`[API] Created AI service: ${aiService.constructor.name}`);

    // Combine file content, extracted text, and requirements if present
    const combinedRequirements = [fileContent, combinedText, requirements]
      .filter((segment): segment is string => Boolean(segment && segment.trim()))
      .join('\n\n');

    const generationRequest: TestCaseGenerationRequest = {
      requirements: combinedRequirements || requirements,
      mode,
      priorityMode,
      selectedScenarios,
      files: enrichedFiles,
      provider,
      model,
      agenticOptions,
    };

    const shouldStream = Boolean(agenticOptions?.streamProgress);
    console.log(`[API] Stream progress: ${shouldStream}`);

    if (shouldStream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          const send = (event: any) => {
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            } catch (error) {
              console.error('[API] Failed to enqueue progress event', error);
            }
          };

          (async () => {
            try {
              await aiService.generateTestCases(generationRequest, send);
              controller.close();
            } catch (error) {
              console.error('Error generating test cases (stream)', error);
              send({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
              });
              controller.close();
            }
          })();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const result = await aiService.generateTestCases(generationRequest);

    console.log(`[API] Generated ${result.testCases?.length || 0} test cases`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating test cases:', error);
    return NextResponse.json(
      { error: 'Failed to generate test cases', details: (error as Error).message },
      { status: 500 }
    );
  }
} 
