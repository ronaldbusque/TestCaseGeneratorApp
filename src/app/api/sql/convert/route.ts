import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { SQLConversionRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sourceDialect, targetDialect } = body as SQLConversionRequest;
    
    console.log("=== SQL CONVERSION API REQUEST ===");
    console.log({ query, sourceDialect, targetDialect });
    console.log("=================================");
    
    if (!query || !sourceDialect || !targetDialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query, sourceDialect, and targetDialect' },
        { status: 400 }
      );
    }
    
    const sqlService = new SQLAIService();
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