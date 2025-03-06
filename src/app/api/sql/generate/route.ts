import { NextRequest, NextResponse } from 'next/server';
import { SQLAIService } from '@/lib/services/ai/sql';
import { SQLGenerationRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, targetDialect, schema } = body as SQLGenerationRequest;
    
    console.log("=== SQL GENERATION API REQUEST ===");
    console.log({ description, targetDialect, schema: schema ? `${schema.substring(0, 100)}...` : undefined });
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
    
    const sqlService = new SQLAIService();
    const result = await sqlService.generateSQLQuery({ description, targetDialect, schema });
    
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