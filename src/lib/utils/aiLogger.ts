import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-interactions.log');
const LOG_JSONL_FILE = path.join(LOG_DIR, 'ai-interactions.jsonl');
const MAX_FIELD_LENGTH = 8000;

let writeQueue: Promise<void> = Promise.resolve();

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

export function logAIInteraction(entry: LogEntry): void {
  writeQueue = writeQueue
    .catch((error) => {
      if (error) {
        console.warn('[AI Logger] Previous log write failed', error);
      }
    })
    .then(async () => {
      try {
        const timestamp = new Date().toISOString();
        const safePrompt = truncate(entry.prompt ?? '');
        const safeResponse = truncate(entry.response ?? '');
        const contextObject = entry.context ?? {};
        const context = Object.keys(contextObject).length > 0
          ? JSON.stringify(contextObject, null, 2)
          : '{}';

        const readableBlock = [
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

        const structuredEntry = {
          timestamp,
          provider: entry.provider,
          model: entry.model ?? null,
          prompt: safePrompt,
          response: safeResponse,
          context: contextObject,
        };

        await fs.mkdir(LOG_DIR, { recursive: true });
        await Promise.all([
          fs.appendFile(LOG_FILE, readableBlock, 'utf8'),
          fs.appendFile(LOG_JSONL_FILE, `${JSON.stringify(structuredEntry)}\n`, 'utf8'),
        ]);
      } catch (error) {
        console.warn('[AI Logger] Failed to write log entry', error);
      }
    });
}

export async function waitForLogFlush(): Promise<void> {
  try {
    await writeQueue;
  } catch (error) {
    console.warn('[AI Logger] Log flush surfaced error', error);
  }
}
