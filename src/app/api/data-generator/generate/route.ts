import { NextRequest, NextResponse } from 'next/server';
import { TestDataGeneratorService } from '@/lib/services/ai/testDataGenerator';
import { createAIService } from '@/lib/services/ai/factory';
import { LLMProvider } from '@/lib/types';
import usageTracker from '@/lib/server/usageTracker';
import { generateDataPayloadSchema } from '@/lib/data-generator/validation';
import type { TestDataGenerationResponse } from '@/lib/types/testData';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsedPayload = generateDataPayloadSchema.safeParse(rawBody);

    if (!parsedPayload.success) {
      const { fieldErrors } = parsedPayload.error.flatten();
      if (fieldErrors.fields) {
        return NextResponse.json(
          { error: 'Missing required field: fields', details: fieldErrors.fields },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid payload', details: fieldErrors },
        { status: 400 }
      );
    }

    const {
      fields,
      count = 100,
      format = 'JSON',
      options,
      aiEnhancement,
      provider,
      model,
      seed,
    } = parsedPayload.data;
    
    console.log("=== TEST DATA GENERATION API REQUEST ===");
    console.log({
      fields: Array.isArray(fields) ? fields.map((f) => `${f.name} (${f.type})`) : 'invalid',
      count, 
      format,
      options,
      hasAiEnhancement: !!aiEnhancement,
      provider: provider ?? 'openai',
      model: model ?? 'default',
      seed: seed ?? null,
    });
    console.log("=======================================");
    
    const providerForService: LLMProvider | undefined = provider as LLMProvider | undefined;

    const coreAIService = createAIService(providerForService);
    const userIdentifier = request.headers.get('X-User-Identifier') ?? undefined;
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);
    
    const dataGeneratorService = new TestDataGeneratorService(coreAIService);
    console.log('TestDataGeneratorService instantiated with the core AI service');
    
    const result = await dataGeneratorService.generateTestDataFromFields({
      fields,
      count,
      aiEnhancement,
      model,
      seed,
    });
    
    console.log("=== TEST DATA GENERATION API RESPONSE ===");
    console.log(`Generated ${result.data.length} records`);
    console.log("========================================");
    
    if (result.error) {
      console.warn(`Test data generation encountered an issue: ${result.error}`);
      // Still return with 200 status as we might have partial results
      return NextResponse.json(result satisfies TestDataGenerationResponse);
    }

    if (userIdentifier && !result.error) {
      console.log('[API][Test Data Generate] Recording usage', {
        userIdentifier,
        provider: providerForService ?? 'openai',
        model,
        count,
        format,
      });
      await usageTracker.recordUsage({
        userIdentifier,
        feature: 'test-data-generator',
        provider: providerForService ?? 'openai',
        model: model ?? null,
        metadata: { count, format },
      });
    }

    return NextResponse.json(result satisfies TestDataGenerationResponse);
  } catch (error) {
    console.error('Error generating test data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate test data',
        data: [],
        debug: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }
} 
