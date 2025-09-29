#!/usr/bin/env node
import { generateObject } from 'ai';
import { resolveLanguageModel } from '../src/lib/services/ai/vercelClient';
import { summarizeFiles } from '../src/lib/services/ai/utils';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const PlannerItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    area: z.string(),
    focus: z.string(),
    estimatedCases: z.number().optional(),
    chunkRefs: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

const PlannerSchema = z.object({ items: z.array(PlannerItemSchema) });

async function probe(model, provider) {
  const prompt = [
    'You are an expert QA strategist. Break the supplied materials into a concise execution plan for generating test cases.',
    'Priority mode: comprehensive. Ensure broad coverage including edge cases. Produce a JSON object with an "items" array of plan entries (id, title, area, focus, estimatedCases, chunkRefs when applicable).',
    'Keep each focus under 160 characters and notes under 220 characters. Do not enumerate every acceptance criterion; summarize only the key goals for coverage.',
    'Requirements:\nAs a user I can view, edit, and share my profile. There are privacy settings, admin overrides, and a new MFA flow from the requirements doc.',
    'No reference files. No existing scenarios.',
  ].join('\n\n');

  const languageModel = resolveLanguageModel({ provider, model });

  const result = await generateObject({
    model: languageModel,
    schema: PlannerSchema,
    prompt,
  });

  return {
    provider,
    model,
    planItems: result.object.items,
    raw: result.text,
  };
}

async function main() {
  const openaiModel = process.argv[2] ?? 'gpt-5-mini';
  const geminiModel = process.argv[3] ?? 'models/gemini-1.5-flash-latest';

  const [openaiResult, geminiResult] = await Promise.all([
    probe(openaiModel, 'openai'),
    probe(geminiModel, 'gemini'),
  ]);

  console.log(JSON.stringify({ openaiResult, geminiResult }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
