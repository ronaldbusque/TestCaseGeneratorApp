declare module 'pdf-parse/lib/pdf-parse.js' {
  import type { Buffer } from 'buffer';

  interface PDFMetadata {
    metadata?: any;
    info?: any;
    version?: string;
  }

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: PDFMetadata | null;
    text: string;
    version?: string;
  }

  interface PDFParseOptions {
    pagerender?: (pageData: any) => Promise<string>;
    max?: number;
    version?: string;
  }

  function pdf(buffer: Buffer | Uint8Array, options?: PDFParseOptions): Promise<PDFParseResult>;
  export default pdf;
}
