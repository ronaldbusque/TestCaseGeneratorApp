import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { createAIService } from '@/lib/services/ai/factory';
import { SQLValidationRequest, AIModel } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, dialect, schema, model = 'Gemini' } = body as SQLValidationRequest & { model?: AIModel };
    
    console.log("=== SQL VALIDATION API REQUEST ===");
    console.log({ query, dialect, schema: schema ? `${schema.substring(0, 100)}...` : undefined, model });
    console.log("=================================");
    
    if (!query || !dialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query and dialect' },
        { status: 400 }
      );
    }
    
    const coreAIService = createAIService(model);
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);
    
    const sqlService = new SQLAIService(coreAIService);
    console.log('SQLAIService instantiated with the core AI service');
    
    const result = await sqlService.validateSQLQuery({ query, dialect, schema });
    
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