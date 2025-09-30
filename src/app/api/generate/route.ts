import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/services/ai/factory';
import { extractFullTextFromFiles } from '@/lib/server/fileTextExtraction';
import { TestCaseGenerationRequest, UploadedFilePayload } from '@/lib/types';
import usageTracker from '@/lib/server/usageTracker';

const IS_VERCEL = process.env.VERCEL === '1';

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
    
    const userIdentifier = request.headers.get('X-User-Identifier');
    console.log(`[API] User identifier from middleware: ${userIdentifier}`);
    
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

    const combinedRequirements = [fileContent, combinedText, requirements]
      .filter((segment): segment is string => Boolean(segment && segment.trim()))
      .join('\n\n');

    const effectiveAgenticOptions = (() => {
      if (!agenticOptions?.enableAgentic) {
        return undefined;
      }
      if (IS_VERCEL) {
        console.warn('[API] Agentic workflow disabled in serverless runtime; falling back to single-shot generation');
        return undefined;
      }
      return {
        ...agenticOptions,
        streamProgress: true,
      } as TestCaseGenerationRequest['agenticOptions'];
    })();

    const generationRequest: TestCaseGenerationRequest = {
      requirements: combinedRequirements || requirements,
      mode,
      priorityMode,
      selectedScenarios,
      files: enrichedFiles,
      provider,
      model,
      agenticOptions: effectiveAgenticOptions,
      userIdentifier: userIdentifier ?? undefined,
    };

    const shouldStream = Boolean(effectiveAgenticOptions?.streamProgress);
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
              if (userIdentifier) {
                console.log('[API] Recording test-case usage (stream)', {
                  userIdentifier,
                  provider: provider ?? 'openai',
                  model,
                  priorityMode,
                });
                await usageTracker.recordUsage({
                  userIdentifier,
                  feature: 'test-case-generator',
                  provider: provider ?? 'openai',
                  model: model ?? contextDefaultModel(agenticOptions),
                  priorityMode: priorityMode ?? 'comprehensive',
                  metadata: {
                    mode,
                    plannerProvider: agenticOptions?.plannerProvider,
                    writerProvider: agenticOptions?.writerProvider,
                    reviewerProvider: agenticOptions?.reviewerProvider,
                  },
                });
              }
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

    if (userIdentifier) {
      console.log('[API] Recording test-case usage', {
        userIdentifier,
        provider: provider ?? 'openai',
        model,
        priorityMode,
      });
      await usageTracker.recordUsage({
        userIdentifier,
        feature: 'test-case-generator',
        provider: provider ?? 'openai',
        model: model ?? contextDefaultModel(agenticOptions),
        priorityMode: priorityMode ?? 'comprehensive',
        metadata: {
          mode,
          plannerProvider: agenticOptions?.plannerProvider,
          writerProvider: agenticOptions?.writerProvider,
          reviewerProvider: agenticOptions?.reviewerProvider,
        },
      });
    }

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

function contextDefaultModel(agenticOptions: TestCaseGenerationRequest['agenticOptions']): string | null {
  if (!agenticOptions) {
    return null;
  }
  return (
    agenticOptions.writerModel ||
    agenticOptions.plannerModel ||
    agenticOptions.reviewerModel ||
    null
  );
}
