import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { formatPreviewData } from '@/lib/data-generator/formatPreview';

interface RawDataPreviewProps {
  data: any[];
  format: 'CSV' | 'JSON' | 'SQL' | 'Excel';
  options: {
    lineEnding: 'Unix (LF)' | 'Windows (CRLF)';
    includeHeader: boolean;
    includeBOM: boolean;
  };
}

export function RawDataPreview({ data, format, options }: RawDataPreviewProps) {
  const { content, language } = formatPreviewData(
    data,
    format,
    options,
    'test_data'
  );

  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      <div className="max-h-[600px] overflow-auto">
        <SyntaxHighlighter 
          language={language} 
          style={atomDark}
          customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
} 
