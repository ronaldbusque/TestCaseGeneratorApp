import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

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
  const formatRawData = (): { content: string; language: string } => {
    let content = '';
    let language = 'javascript';
    const lineEndingChar = options.lineEnding === 'Unix (LF)' ? '\n' : '\r\n';
    
    switch (format) {
      case 'JSON':
        content = JSON.stringify(data, null, 2);
        language = 'json';
        break;
        
      case 'CSV':
        // Get all unique keys
        const headers = Array.from(new Set(data.flatMap(row => Object.keys(row))));
        
        // Create CSV content
        if (options.includeHeader) {
          content = headers.join(',') + lineEndingChar;
        }
        
        content += data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        ).join(lineEndingChar);
        
        language = 'csv';
        break;
        
      case 'SQL':
        // Assume the first object has all fields for the table structure
        if (data.length > 0) {
          const tableName = 'test_data';
          const columns = Object.keys(data[0]);
          
          // Create INSERT statements
          const inserts = data.map(row => {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null || value === undefined) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
              return value;
            });
            
            return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
          });
          
          content = [
            `-- Test data preview`,
            `-- ${inserts.length} rows`,
            '',
            `CREATE TABLE ${tableName} (`,
            columns.map(col => `  ${col} VARCHAR(255)`).join(',\n'),
            ');',
            '',
            ...inserts
          ].join(lineEndingChar);
        }
        
        language = 'sql';
        break;
        
      case 'Excel':
        // For Excel preview, show as CSV
        const xlsHeaders = Array.from(new Set(data.flatMap(row => Object.keys(row))));
        
        if (options.includeHeader) {
          content = xlsHeaders.join(',') + lineEndingChar;
        }
        
        content += data.map(row => 
          xlsHeaders.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        ).join(lineEndingChar);
        
        language = 'csv';
        break;
    }
    
    return { content, language };
  };

  const { content, language } = formatRawData();

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