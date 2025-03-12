// DEPRECATED: This endpoint is no longer used as AI enhancement has been integrated directly into the generate endpoint.
// This file is kept for backward compatibility but will be removed in a future update.

import { NextRequest, NextResponse } from 'next/server';
import { TestDataGeneratorService } from '@/lib/services/ai/testDataGenerator';

interface FieldDefinition {
  name: string;
  type: string;
  options: Record<string, any>;
}

interface EnhanceRequest {
  data: Record<string, any>[];
  prompt: string;
  fields: FieldDefinition[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, prompt, fields } = body as EnhanceRequest;
    
    console.log("=== TEST DATA ENHANCEMENT API REQUEST ===");
    console.log({ 
      dataLength: data.length,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      fields: fields.map(f => `${f.name} (${f.type})`)
    });
    console.log("=========================================");
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty data array' },
        { status: 400 }
      );
    }
    
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty enhancement prompt' },
        { status: 400 }
      );
    }
    
    const dataGeneratorService = new TestDataGeneratorService();
    const result = await dataGeneratorService.enhanceDataWithAI(data, prompt);
    
    console.log("=== TEST DATA ENHANCEMENT API RESPONSE ===");
    console.log(`Enhanced ${result.data.length} records`);
    if (result.aiExplanation) {
      console.log(`Explanation: ${result.aiExplanation.substring(0, 100)}...`);
    }
    console.log("==========================================");
    
    if (result.error) {
      console.warn(`Test data enhancement encountered an issue: ${result.error}`);
      // Still return with 200 status as we might have partial results
      return NextResponse.json(result);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error enhancing test data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to enhance test data',
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