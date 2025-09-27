import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-interactions.log');
const MAX_FIELD_LENGTH = 8000;

interface LogEntry {
  provider: string;
  model?: string | null;
  prompt: string;
  response: string;
  context?: Record<string, any>;
}

function truncate(value: string): string {
  if (value.length <= MAX_FIELD_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_FIELD_LENGTH)}... [truncated ${value.length - MAX_FIELD_LENGTH} chars]`;
}

export async function logAIInteraction(entry: LogEntry): Promise<void> {
  try {
    const safeEntry = {
      timestamp: new Date().toISOString(),
      provider: entry.provider,
      model: entry.model ?? null,
      prompt: truncate(entry.prompt),
      response: truncate(entry.response),
      context: entry.context ?? {},
    };

    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, `${JSON.stringify(safeEntry)}\n`, 'utf8');
  } catch (error) {
    // Intentionally swallow logging errors to avoid breaking runtime behaviour
    console.warn('[AI Logger] Failed to write log entry', error);
  }
}
