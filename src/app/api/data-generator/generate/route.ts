import { NextRequest, NextResponse } from 'next/server';
import { TestDataGeneratorService } from '@/lib/services/ai/testDataGenerator';

interface FieldDefinition {
  name: string;
  type: string;
  options: Record<string, any>;
}

interface GenerateRequest {
  fields: FieldDefinition[];
  count: number;
  format: 'CSV' | 'JSON' | 'SQL' | 'Excel';
  options: {
    lineEnding: 'Unix (LF)' | 'Windows (CRLF)';
    includeHeader: boolean;
    includeBOM: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fields, count = 10, format = 'JSON', options } = body as GenerateRequest;
    
    console.log("=== TEST DATA GENERATION API REQUEST ===");
    console.log({ 
      fields: fields.map(f => `${f.name} (${f.type})`),
      count, 
      format,
      options
    });
    console.log("=======================================");
    
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fields' },
        { status: 400 }
      );
    }
    
    const dataGeneratorService = new TestDataGeneratorService();
    const result = await dataGeneratorService.generateTestDataFromFields({ 
      fields, 
      count
    });
    
    console.log("=== TEST DATA GENERATION API RESPONSE ===");
    console.log(`Generated ${result.data.length} records`);
    console.log("========================================");
    
    if (result.error) {
      console.warn(`Test data generation encountered an issue: ${result.error}`);
      // Still return with 200 status as we might have partial results
      return NextResponse.json(result);
    }
    
    return NextResponse.json(result);
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