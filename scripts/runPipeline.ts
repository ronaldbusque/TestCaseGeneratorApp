#!/usr/bin/env ts-node
import { TestCaseAgenticPipeline } from '../src/lib/services/ai/pipeline/testCasePipeline';
import { TestCaseGenerationRequest } from '../src/lib/types';
import * as dotenv from 'dotenv';

dotenv.config();

async function run(model: string, provider: 'openai' | 'gemini') {
  const request: TestCaseGenerationRequest = {
    requirements:
      'As a user I can view, edit, and share my profile. There are privacy settings, admin overrides, and a new MFA flow from the requirements doc.',
    files: [],
    mode: 'high-level',
    priorityMode: 'comprehensive',
    provider,
    model,
    agenticOptions: {
      enableAgentic: true,
      plannerProvider: provider,
      plannerModel: model,
      writerProvider: provider,
      writerModel: model,
      reviewerProvider: provider,
      reviewerModel: model,
      maxReviewPasses: 1,
      streamProgress: false,
    },
  };

  const pipeline = new TestCaseAgenticPipeline();

  const result = await pipeline.generate(request, (event) => {
    console.log('EVENT', JSON.stringify(event));
  });

  return result;
}

async function main() {
  const openaiModel = process.argv[2] ?? 'gpt-5-mini';
  const provider = (process.argv[3] as 'openai' | 'gemini') ?? 'openai';
  const result = await run(openaiModel, provider);
  console.log(JSON.stringify(result.telemetry, null, 2));
  console.log('Plan length', result.plan?.length);
  console.log('Test cases', result.testCases.length);
  console.log('Warnings', result.warnings);
}

main().catch((error) => {
  console.error('Pipeline run failed', error);
  process.exit(1);
});
