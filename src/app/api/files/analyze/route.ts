import { NextRequest, NextResponse } from 'next/server';
import { extractFullTextFromFiles } from '@/lib/server/fileTextExtraction';
import { countTokens, getContextWindow } from '@/lib/server/tokenizer';
import { LLMProvider } from '@/lib/types/providers';
import { UploadedFilePayload } from '@/lib/types';

const USER_ID_HEADER = 'X-User-Identifier';

function normaliseProvider(value: unknown): LLMProvider {
  if (value === 'gemini' || value === 'openrouter') {
    return value;
  }
  return 'openai';
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) {
    return NextResponse.json({ error: 'Missing user identifier' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const files = Array.isArray(body?.files) ? (body.files as UploadedFilePayload[]) : [];
    const provider = normaliseProvider(body?.provider);
    const model = typeof body?.model === 'string' ? body.model : undefined;
    const requirements = typeof body?.requirements === 'string' ? body.requirements : '';

    const { summaries } = await extractFullTextFromFiles(files);

    const perFile = summaries.map((summary) => {
      const tokens = countTokens(summary.text, model);
      return {
        name: summary.file.name,
        type: summary.file.type,
        size: summary.file.size,
        tokens,
        characters: summary.text.length,
      };
    });

    const fileTokens = perFile.reduce((total, item) => total + item.tokens, 0);
    const requirementsTokens = countTokens(requirements, model);
    const combinedTokens = fileTokens + requirementsTokens;
    const contextLimit = getContextWindow(provider, model ?? undefined);

    return NextResponse.json({
      files: perFile,
      totals: {
        fileTokens,
        requirementsTokens,
        combinedTokens,
        contextLimit,
      },
      provider,
      model,
    });
  } catch (error) {
    console.error('[files/analyze] Unable to analyse files', error);
    return NextResponse.json({ error: 'Failed to analyse file tokens' }, { status: 500 });
  }
}
