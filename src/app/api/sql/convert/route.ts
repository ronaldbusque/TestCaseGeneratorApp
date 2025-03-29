import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { createAIService } from '@/lib/services/ai/factory';
import { SQLConversionRequest, AIModel } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sourceDialect, targetDialect, model = 'Gemini' } = body as SQLConversionRequest & { model?: AIModel };
    
    console.log("=== SQL CONVERSION API REQUEST ===");
    console.log({ query, sourceDialect, targetDialect, model });
    console.log("=================================");
    
    if (!query || !sourceDialect || !targetDialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query, sourceDialect, and targetDialect' },
        { status: 400 }
      );
    }
    
    const coreAIService = createAIService(model);
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);
    
    const sqlService = new SQLAIService(coreAIService);
    console.log('SQLAIService instantiated with the core AI service');
    
    const result = await sqlService.convertSQLQuery({ query, sourceDialect, targetDialect });
    
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