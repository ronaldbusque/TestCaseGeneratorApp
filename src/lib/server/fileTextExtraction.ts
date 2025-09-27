import { Buffer } from 'buffer';
import mammoth from 'mammoth';
import { UploadedFilePayload } from '@/lib/types';

export interface FileTextSummary {
  file: UploadedFilePayload;
  text: string;
}

function isPdf(file: UploadedFilePayload): boolean {
  return file.type?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf') || false;
}

function isDocx(file: UploadedFilePayload): boolean {
  return (
    file.type?.includes('wordprocessingml') ||
    file.name?.toLowerCase().endsWith('.docx') ||
    false
  );
}

function isDoc(file: UploadedFilePayload): boolean {
  return file.type === 'application/msword' || file.name?.toLowerCase().endsWith('.doc');
}

function isTextLike(file: UploadedFilePayload): boolean {
  return (
    file.type?.startsWith('text/') ||
    file.type === 'application/json' ||
    file.name?.toLowerCase().endsWith('.json') ||
    file.name?.toLowerCase().endsWith('.txt')
  );
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? '';
}

async function extractDoc(buffer: Buffer): Promise<string> {
  // Older .doc binaries are not supported; return empty string to fall back to preview
  console.warn('[fileTextExtraction] .doc format detected; unable to extract reliably');
  return '';
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
  const result = await pdfParse(buffer);
  return result.text ?? '';
}

function decodeBase64(data?: string): Buffer | null {
  if (!data) {
    return null;
  }
  try {
    return Buffer.from(data, 'base64');
  } catch (error) {
    console.warn('[fileTextExtraction] Failed to decode base64 buffer', error);
    return null;
  }
}

export async function extractFullTextFromFiles(
  files?: UploadedFilePayload[]
): Promise<{ enrichedFiles: UploadedFilePayload[]; combinedText: string; summaries: FileTextSummary[]; }> {
  if (!files?.length) {
    return { enrichedFiles: files ?? [], combinedText: '', summaries: [] };
  }

  const textChunks: string[] = [];
  const enrichedFiles: UploadedFilePayload[] = [];
  const summaries: FileTextSummary[] = [];

  for (const file of files) {
    const buffer = decodeBase64(file.data);
    let extracted = '';

    try {
      if (buffer && isPdf(file)) {
        extracted = await extractPdf(buffer);
      } else if (buffer && isDocx(file)) {
        extracted = await extractDocx(buffer);
      } else if (buffer && isDoc(file)) {
        extracted = await extractDoc(buffer);
      } else if (buffer && isTextLike(file)) {
        extracted = buffer.toString('utf8');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown extraction error';
      console.warn(`[fileTextExtraction] Failed to extract ${file.name}`, message);
    }

    const cleaned = extracted?.trim() ?? '';
    const resolvedText = cleaned || file.preview || '';

    if (resolvedText) {
      const header = `=== ${file.name || 'uploaded-file'} (${file.type || 'unknown'} / ${file.size ?? 'unknown'} bytes) ===`;
      textChunks.push(`${header}\n${resolvedText}`);
      summaries.push({ file, text: resolvedText });
      enrichedFiles.push({ ...file, preview: resolvedText });
    } else {
      summaries.push({ file, text: '' });
      enrichedFiles.push(file);
    }
  }

  return {
    enrichedFiles,
    combinedText: textChunks.join('\n\n'),
    summaries,
  };
}
