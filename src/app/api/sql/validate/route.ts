import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { createAIService } from '@/lib/services/ai/factory';
import { SQLValidationRequest, LLMProvider } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, dialect, schema, provider, model } = body as SQLValidationRequest & { provider?: LLMProvider };
    
    console.log("=== SQL VALIDATION API REQUEST ===");
    console.log({ query, dialect, provider: provider ?? 'openai', model: model ?? 'default', schema: schema ? `${schema.substring(0, 100)}...` : undefined });
    console.log("=================================");
    
    if (!query || !dialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query and dialect' },
        { status: 400 }
      );
    }
    
    const coreAIService = createAIService(provider);
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);
    
    const sqlService = new SQLAIService(coreAIService);
    console.log('SQLAIService instantiated with the core AI service');
    
    const result = await sqlService.validateSQLQuery({ query, dialect, schema, model });
    
    console.log("=== SQL VALIDATION API RESPONSE ===");
    console.log(JSON.stringify(result, null, 2));
    console.log("==================================");
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating SQL query:', error);
    return NextResponse.json(
      { error: 'Failed to validate SQL query' },
      { status: 500 }
    );
  }
} 
