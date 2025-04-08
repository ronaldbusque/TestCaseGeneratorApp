import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/services/ai/factory';
import { TestCaseGenerationRequest, AIModel } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Test case generation endpoint called');
    
    const body = await request.json();
    const { 
      requirements, 
      mode, 
      priorityMode, 
      selectedScenarios,
      fileContent, // Accept file content instead of File objects
      model = 'Gemini' 
    } = body as TestCaseGenerationRequest & { 
      model?: AIModel;
      fileContent?: string; // Additional parameter for file content
    };
    
    // Get the user identifier from the headers (added by middleware)
    const userIdentifier = request.headers.get('X-User-Identifier');
    console.log(`[API] User identifier from middleware: ${userIdentifier}`);
    
    // Log safely without exposing the entire content of requirements or fileContent
    console.log(`[API] Request details - Mode: ${mode}, Model: ${model}, Requirements: ${requirements ? `${requirements.substring(0, 50)}...` : 'None'}, File content: ${fileContent ? 'Provided' : 'None'}`);
    
    if (!requirements && !selectedScenarios?.length) {
      return NextResponse.json(
        { error: 'Missing requirements or scenarios' },
        { status: 400 }
      );
    }
    
    const aiService = createAIService(model);
    console.log(`[API] Created AI service: ${aiService.constructor.name}`);
    
    // Combine file content and requirements if both are present
    const combinedRequirements = [fileContent, requirements]
      .filter(Boolean)
      .join('\n\n');
    
    const result = await aiService.generateTestCases({
      requirements: combinedRequirements,
      mode,
      priorityMode,
      selectedScenarios,
      files: [] // Files are handled differently now with fileContent
    });
    
    console.log(`[API] Generated ${result.testCases?.length || 0} test cases`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating test cases:', error);
    return NextResponse.json(
      { error: 'Failed to generate test cases', details: (error as Error).message },
      { status: 500 }
    );
  }
} 