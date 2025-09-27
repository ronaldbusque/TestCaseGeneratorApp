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
    const timestamp = new Date().toISOString();
    const safePrompt = truncate(entry.prompt ?? '');
    const safeResponse = truncate(entry.response ?? '');
    const context = entry.context && Object.keys(entry.context).length > 0
      ? JSON.stringify(entry.context, null, 2)
      : '{}';

    const logBlock = [
      '---',
      `timestamp: ${timestamp}`,
      `provider: ${entry.provider}`,
      `model: ${entry.model ?? 'default'}`,
      `context: ${context}`,
      'PROMPT:',
      safePrompt,
      '',
      'RESPONSE:',
      safeResponse,
      '---',
      '',
    ].join('\n');

    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, logBlock, 'utf8');
  } catch (error) {
    // Intentionally swallow logging errors to avoid breaking runtime behaviour
    console.warn('[AI Logger] Failed to write log entry', error);
  }
}
