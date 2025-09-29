#!/usr/bin/env ts-node
import { generateObject, generateText } from 'ai';
import { resolveLanguageModel } from '../src/lib/services/ai/vercelClient';
import { summarizeFiles } from '../src/lib/services/ai/utils';
import { TestCaseGenerationRequest } from '../src/lib/types';
import { z } from 'zod';

const PlannerItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    area: z.string(),
    focus: z.string(),
    estimatedCases: z.number().int().positive(),
    chunkRefs: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict();

const PlannerSchema = z
  .object({ items: z.array(PlannerItemSchema) })
  .strict();

async function probe(model: string, provider: 'openai' | 'gemini') {
  const request: TestCaseGenerationRequest = {
    requirements:
      'As a user I can view, edit, and share my profile. There are privacy settings, admin overrides, and a new MFA flow from the requirements doc.',
    files: [],
    mode: 'high-level',
    priorityMode: 'comprehensive',
  };

  const filesSummary = summarizeFiles(request.files);
  const promptSections = [
    'You are an expert QA strategist. Break the supplied materials into a concise execution plan for generating test cases.',
    `Priority mode: ${request.priorityMode}. If comprehensive, ensure broad coverage including edge cases. If core-functionality, focus on critical user journeys and regulatory must-haves. Produce a JSON object with an "items" array of plan entries (id, title, area, focus, estimatedCases, chunkRefs when applicable).`,
    'Keep each focus under 160 characters and notes under 220 characters. Do not enumerate every acceptance criterion; summarize only the key goals for coverage.',
    request.requirements ? `Requirements:\n${request.requirements}` : 'No requirements provided.',
    filesSummary ? `Reference documents:\n${filesSummary}` : '',
    'No existing scenarios.',
  ].filter(Boolean);
  const prompt = promptSections.join('\n\n');

  const languageModel = resolveLanguageModel({ provider, model });

  try {
    const result = await generateObject({
      model: languageModel,
      schema: PlannerSchema,
      prompt,
    });

    return {
      provider,
      model,
      planItems: result.object.items,
      raw: JSON.stringify(result.object),
    };
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (!message.includes("Invalid schema for response_format 'response'")) {
      throw error;
    }

    const relaxedPrompt = `${prompt}\n\nIMPORTANT: Return JSON with an "items" array where each entry includes id, title, area, focus, estimatedCases (positive integer), chunkRefs (array of strings when applicable), and notes (optional).`;
    const textResult = await generateText({
      model: languageModel,
      prompt: relaxedPrompt,
    });

    const cleaned = cleanPlannerJson(textResult.text);
    const parsed = JSON.parse(cleaned);

    const relaxedSchema = z
      .object({
        items: z
          .array(
            z
              .object({
                id: z.string(),
                title: z.string(),
                area: z.string(),
                focus: z.string().optional(),
                estimatedCases: z.number().optional(),
                chunkRefs: z.array(z.string()).optional(),
                notes: z.string().optional(),
              })
              .strict()
          )
          .optional(),
      })
      .strict();

    const relaxed = relaxedSchema.parse(parsed);

    return {
      provider,
      model,
      planItems: relaxed.items ?? [],
      raw: cleaned,
    };
  }
}

function cleanPlannerJson(raw: string): string {
  let content = raw.trim();
  const codeFenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFenceMatch) {
    content = codeFenceMatch[1].trim();
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    content = content.slice(firstBrace, lastBrace + 1);
  }

  return content;
}

async function main() {
  const openaiModel = process.argv[2] ?? 'gpt-5-mini';
  const geminiModel = process.argv[3] ?? 'models/gemini-1.5-flash-latest';

  const openaiResult = await probe(openaiModel, 'openai');
  const geminiResult = await probe(geminiModel, 'gemini');

  console.log(JSON.stringify({ openaiResult, geminiResult }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
