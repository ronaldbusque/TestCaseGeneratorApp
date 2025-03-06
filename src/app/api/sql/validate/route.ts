import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { SQLValidationRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, dialect } = body as SQLValidationRequest;
    
    if (!query || !dialect) {
      return NextResponse.json(
        { error: 'Missing required fields: query and dialect' },
        { status: 400 }
      );
    }
    
    const sqlService = new SQLAIService();
    const result = await sqlService.validateSQLQuery({ query, dialect });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating SQL query:', error);
    return NextResponse.json(
      { error: 'Failed to validate SQL query' },
      { status: 500 }
    );
  }
} 