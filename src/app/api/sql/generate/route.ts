import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { createAIService } from '@/lib/services/ai/factory';
import { SQLGenerationRequest, LLMProvider } from '@/lib/types';
import usageTracker from '@/lib/server/usageTracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, targetDialect, schema, provider, model } = body as SQLGenerationRequest & { provider?: LLMProvider };
    
    console.log("=== SQL GENERATION API REQUEST ===");
    console.log({ description, targetDialect, provider: provider ?? 'openai', model: model ?? 'default', schema: schema ? `${schema.substring(0, 100)}...` : undefined });
    console.log("==================================");
    
    if (!description || !targetDialect) {
      return NextResponse.json(
        { error: 'Missing required fields: description and targetDialect' },
        { status: 400 }
      );
    }
    
    console.log(`Generating SQL query for dialect: ${targetDialect}`);
    console.log(`Description: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`);
    if (schema) {
      console.log(`Schema provided (${schema.length} characters)`);
    }

    const coreAIService = createAIService(provider);
    const userIdentifier = request.headers.get('X-User-Identifier') ?? undefined;
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);
    
    const sqlService = new SQLAIService(coreAIService, userIdentifier);
    console.log('SQLAIService instantiated with the core AI service');
    
    const result = await sqlService.generateSQLQuery({ description, targetDialect, schema, model });

    if (userIdentifier) {
      console.log('[API][SQL Generate] Recording usage', {
        userIdentifier,
        provider: provider ?? 'openai',
        model,
        targetDialect,
      });
      await usageTracker.recordUsage({
        userIdentifier,
        feature: 'sql-generate',
        provider: provider ?? 'openai',
        model: model ?? null,
        metadata: { targetDialect },
      });
    }
    
    console.log("=== SQL GENERATION API RESPONSE ===");
    console.log(JSON.stringify(result, null, 2));
    console.log("===================================");
    
    if (result.error) {
      console.warn(`SQL generation encountered an issue: ${result.error}`);
      if (result.debug?.parseError) {
        console.warn(`Parse error: ${result.debug.parseError}`);
      }
      // Still return with 200 status as we might have partial results
      return NextResponse.json(result);
    }
    
    console.log(`Successfully generated SQL query (${result.query.length} characters)`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating SQL query:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate SQL query',
        query: '',
        debug: {
          parseError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      },
      { status: 500 }
    );
  }
} 
