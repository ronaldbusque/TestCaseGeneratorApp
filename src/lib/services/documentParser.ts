import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

export async function parseDocument(file: File): Promise<string | null> {
  const fileType = file.type.toLowerCase();

  try {
    switch (fileType) {
      case 'application/pdf':
        return await parsePdfDocument(file);
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseWordDocument(file);
      case 'text/plain':
        return await parseTextFile(file);
      case 'image/png':
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/gif':
      case 'image/webp':
        // Images don't need text parsing, return null
        return null;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error parsing file ${file.name}:`, error);
    throw error;
  }
}

async function parsePdfDocument(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const maxPages = pdf.numPages;
  const textContent: string[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    textContent.push(text);
  }

  return textContent.join('\n\n');
}

export async function parseWordDocument(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
} 