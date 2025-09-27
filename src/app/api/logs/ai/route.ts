import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_JSONL_FILE = path.join(LOG_DIR, 'ai-interactions.jsonl');

interface LogEntry {
  timestamp: string;
  provider: string;
  model: string | null;
  prompt: string;
  response: string;
  context?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const providerFilter = params.get('provider');
  const modelFilter = params.get('model');
  const limitParam = params.get('limit');
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 200) : 50;

  try {
    const file = await fs.readFile(LOG_JSONL_FILE, 'utf8');
    const lines = file.split('\n').filter(Boolean).reverse();

    const entries: LogEntry[] = [];
    for (const line of lines) {
      if (entries.length >= limit) break;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        continue;
      }

      if (!parsed || typeof parsed !== 'object') {
        continue;
      }

      const entry = parsed as LogEntry;

      if (providerFilter && entry.provider !== providerFilter) {
        continue;
      }
      if (modelFilter && entry.model !== modelFilter) {
        continue;
      }
      entries.push(entry);
    }

    return NextResponse.json({ entries });
  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      return NextResponse.json({ entries: [] });
    }
    console.error('Failed to read AI logs', error);
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
  }
}
