import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import { HtmlToTextOptions, convert } from 'html-to-text';
import TurndownService from 'turndown';

interface ParsingResult {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    hasImages: boolean;
    format: string;
    structureLevel: 'none' | 'basic' | 'full';
  };
}

interface ParsingOptions {
  preserveStructure: boolean;
  extractImages: boolean;
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: ParsingOptions = {
  preserveStructure: true,
  extractImages: true,
  maxSizeBytes: 10 * 1024 * 1024 // 10MB
};

const htmlToTextOptions: HtmlToTextOptions = {
  wordwrap: 130,
  preserveNewlines: true,
  selectors: [
    { selector: 'h1', options: { uppercase: false, prefix: '# ' } },
    { selector: 'h2', options: { uppercase: false, prefix: '## ' } },
    { selector: 'h3', options: { uppercase: false, prefix: '### ' } },
    { selector: 'h4', options: { uppercase: false, prefix: '#### ' } },
    { selector: 'h5', options: { uppercase: false, prefix: '##### ' } },
    { selector: 'h6', options: { uppercase: false, prefix: '###### ' } },
    { selector: 'table', options: { uppercase: false, maxColumnWidth: 60 } },
    { selector: 'a', options: { ignoreHref: false } },
    { selector: 'ul', options: { itemPrefix: '- ' } },
    { selector: 'ol', options: { itemPrefix: ' ' } }
  ]
};

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

export async function parseDocument(file: File, options: Partial<ParsingOptions> = {}): Promise<ParsingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fileType = file.type.toLowerCase();

  if (file.size > opts.maxSizeBytes!) {
    throw new Error(`File size exceeds maximum limit of ${opts.maxSizeBytes! / (1024 * 1024)}MB`);
  }

  try {
    switch (fileType) {
      case 'application/pdf':
        return await parsePdfDocument(file, opts);
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await parseWordDocument(file, opts);
      case 'text/plain':
        return await parseTextFile(file, opts);
      case 'text/html':
        return await parseHtmlFile(file, opts);
      case 'image/png':
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/gif':
      case 'image/webp':
        return {
          content: '',
          metadata: {
            wordCount: 0,
            hasImages: true,
            format: fileType,
            structureLevel: 'none'
          }
        };
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error parsing file ${file.name}:`, error);
    throw new Error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parsePdfDocument(file: File, options: ParsingOptions): Promise<ParsingResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const maxPages = pdf.numPages;
  const textContent: string[] = [];
  let totalWordCount = 0;
  let hasImages = false;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    
    // Check for images
    if (options.extractImages) {
      const operatorList = await page.getOperatorList();
      hasImages = hasImages || operatorList.fnArray.includes(pdfjs.OPS.paintImageXObject);
    }

    // Process text with structure preservation
    const structuredText = content.items
      .reduce((acc: string[], item: any) => {
        const text = item.str.trim();
        if (!text) return acc;

        // Detect headers by font size
        const fontSize = item.transform[0]; // This is approximate
        if (fontSize > 20) {
          acc.push(`# ${text}`);
        } else if (fontSize > 16) {
          acc.push(`## ${text}`);
        } else if (fontSize > 14) {
          acc.push(`### ${text}`);
        } else {
          acc.push(text);
        }

        totalWordCount += text.split(/\s+/).length;
        return acc;
      }, [])
      .join('\n');

    textContent.push(structuredText);
  }

  const content = textContent.join('\n\n');
  return {
    content,
    metadata: {
      pageCount: maxPages,
      wordCount: totalWordCount,
      hasImages,
      format: 'pdf',
      structureLevel: options.preserveStructure ? 'basic' : 'none'
    }
  };
}

async function parseWordDocument(file: File, options: ParsingOptions): Promise<ParsingResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.convert(
          { arrayBuffer },
          {
            preserveEmptyParagraphs: true,
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Heading 4'] => h4:fresh"
            ]
          }
        );

        const htmlContent = result.value;
        let content: string;

        if (options.preserveStructure) {
          content = turndownService.turndown(htmlContent);
        } else {
          content = convert(htmlContent, htmlToTextOptions);
        }

        resolve({
          content,
          metadata: {
            wordCount: content.split(/\s+/).length,
            hasImages: result.messages.some(msg => msg.type === 'image'),
            format: 'docx',
            structureLevel: options.preserveStructure ? 'full' : 'none'
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function parseTextFile(file: File, options: ParsingOptions): Promise<ParsingResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        resolve({
          content,
          metadata: {
            wordCount: content.split(/\s+/).length,
            hasImages: false,
            format: 'txt',
            structureLevel: 'none'
          }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

async function parseHtmlFile(file: File, options: ParsingOptions): Promise<ParsingResult> {
  const text = await parseTextFile(file, options);
  const content = options.preserveStructure
    ? turndownService.turndown(text.content)
    : convert(text.content, htmlToTextOptions);

  return {
    content,
    metadata: {
      wordCount: content.split(/\s+/).length,
      hasImages: /<img/i.test(text.content),
      format: 'html',
      structureLevel: options.preserveStructure ? 'full' : 'none'
    }
  };
} 