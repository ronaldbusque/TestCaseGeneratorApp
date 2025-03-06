import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { SQLValidationRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, dialect, schema } = body as SQLValidationRequest;
    
    console.log("=== SQL VALIDATION API REQUEST ===");
    console.log({ query, dialect, schema: schema ? `${schema.substring(0, 100)}...` : undefined });
    console.log("=================================");
    
    if (!query || !dialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query and dialect' },
        { status: 400 }
      );
    }
    
    const sqlService = new SQLAIService();
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