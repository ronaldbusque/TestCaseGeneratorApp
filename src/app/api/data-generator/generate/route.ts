import { NextRequest, NextResponse } from 'next/server';
import { TestDataGeneratorService } from '@/lib/services/ai/testDataGenerator';
import { createAIService } from '@/lib/services/ai/factory';
import { AIModel } from '@/lib/types';

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
  aiEnhancement?: string;
  model?: AIModel;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fields, count = 100, format = 'JSON', options, aiEnhancement, model = 'Gemini' } = body as GenerateRequest;
    
    console.log("=== TEST DATA GENERATION API REQUEST ===");
    console.log({ 
      fields: fields.map(f => `${f.name} (${f.type})`),
      count, 
      format,
      options,
      hasAiEnhancement: !!aiEnhancement,
      model
    });
    console.log("=======================================");
    
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: fields' },
        { status: 400 }
      );
    }
    
    const coreAIService = createAIService(model);
    console.log(`Core AI Service created: ${coreAIService.constructor.name}`);
    
    const dataGeneratorService = new TestDataGeneratorService(coreAIService);
    console.log('TestDataGeneratorService instantiated with the core AI service');
    
    const result = await dataGeneratorService.generateTestDataFromFields({ 
      fields, 
      count,
      aiEnhancement
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