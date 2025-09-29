import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { createAIService } from '@/lib/services/ai/factory';
import { SQLConversionRequest, LLMProvider } from '@/lib/types';
import usageTracker from '@/lib/server/usageTracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sourceDialect, targetDialect, provider, model } = body as SQLConversionRequest & { provider?: LLMProvider };
    
    console.log("=== SQL CONVERSION API REQUEST ===");
    console.log({ query, sourceDialect, targetDialect, provider: provider ?? 'openai', model: model ?? 'default' });
    console.log("=================================");
    
    if (!query || !sourceDialect || !targetDialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query, sourceDialect, and targetDialect' },
        { status: 400 }
      );
    }
    
    const coreAIService = createAIService(provider);
    const userIdentifier = request.headers.get('X-User-Identifier') ?? undefined;
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);

    const sqlService = new SQLAIService(coreAIService, userIdentifier);
    console.log('SQLAIService instantiated with the core AI service');
    
    const result = await sqlService.convertSQLQuery({ query, sourceDialect, targetDialect, model });

    if (userIdentifier) {
      console.log('[API][SQL Convert] Recording usage', {
        userIdentifier,
        provider: provider ?? 'openai',
        model,
        sourceDialect,
        targetDialect,
      });
      await usageTracker.recordUsage({
        userIdentifier,
        feature: 'sql-convert',
        provider: provider ?? 'openai',
        model: model ?? null,
        metadata: { sourceDialect, targetDialect },
      });
    }
    
    console.log("=== SQL CONVERSION API RESPONSE ===");
    console.log(JSON.stringify(result, null, 2));
    console.log("==================================");
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error converting SQL query:', error);
    return NextResponse.json(
      { error: 'Failed to convert SQL query' },
      { status: 500 }
    );
  }
} 
