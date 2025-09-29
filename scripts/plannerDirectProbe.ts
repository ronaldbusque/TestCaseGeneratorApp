#!/usr/bin/env ts-node
import { TestCaseAgenticPipeline } from '../src/lib/services/ai/pipeline/testCasePipeline';
import { TestCaseGenerationRequest } from '../src/lib/types';
import { LLMProvider } from '../src/lib/types/providers';

async function probe(plannerProvider: LLMProvider, plannerModel: string) {
  const pipeline = new TestCaseAgenticPipeline();

  const request: TestCaseGenerationRequest = {
    requirements:
      'As a user I can view, edit, and share my profile. There are privacy settings, admin overrides, and a new MFA flow from the requirements doc.',
    files: [],
    mode: 'high-level',
    priorityMode: 'comprehensive',
    provider: plannerProvider,
    agenticOptions: {
      enableAgentic: true,
      plannerProvider,
      plannerModel,
      writerProvider: plannerProvider,
      writerModel: plannerModel,
      reviewerProvider: plannerProvider,
      reviewerModel: plannerModel,
      maxReviewPasses: 0,
      streamProgress: false,
    },
  };

  const context = (pipeline as any).buildContext(request, request.agenticOptions);
  try {
    const plan = await (pipeline as any).runPlanner(context, undefined);
    return { plan };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const openaiModel = process.argv[2] ?? 'gpt-5-mini';
  const geminiModel = process.argv[3] ?? 'gemini-flash-latest';

  const openaiProbe = await probe('openai', openaiModel);
  const geminiProbe = await probe('gemini', geminiModel);

  console.log(JSON.stringify({ openaiProbe, geminiProbe }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
