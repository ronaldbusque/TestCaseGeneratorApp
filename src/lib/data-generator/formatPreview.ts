import type { ExportFormat, LineEnding } from '@/lib/data-generator/types';

interface FormatPreviewOptions {
  lineEnding: LineEnding;
  includeHeader: boolean;
  includeBOM: boolean;
}

const resolveLineEnding = (lineEnding: LineEnding) =>
  lineEnding === 'Windows (CRLF)' ? '\r\n' : '\n';

const formatCsv = (
  data: Array<Record<string, unknown>>,
  options: FormatPreviewOptions,
  fallbackTableName: string
) => {
  const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  const lineEnding = resolveLineEnding(options.lineEnding);

  const encodeRow = (row: Record<string, unknown>) =>
    headers
      .map((header) => {
        const value = row[header];
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      })
      .join(',');

  const headerRow = options.includeHeader ? `${headers.join(',')}${lineEnding}` : '';
  const contentRows = data.map((row) => encodeRow(row)).join(lineEnding);

  const content = `${options.includeBOM ? '\ufeff' : ''}${headerRow}${contentRows}`;
  return { content, language: 'csv' as const, filename: `${fallbackTableName}.csv` };
};

const formatJson = (data: Array<Record<string, unknown>>) => ({
  content: JSON.stringify(data, null, 2),
  language: 'json' as const,
  filename: 'preview.json',
});

const formatSql = (
  data: Array<Record<string, unknown>>,
  options: FormatPreviewOptions,
  fallbackTableName: string
) => {
  const lineEnding = resolveLineEnding(options.lineEnding);
  if (data.length === 0) {
    return {
      content: `-- Test data preview${lineEnding}-- 0 rows`,
      language: 'sql' as const,
      filename: `${fallbackTableName}.sql`,
    };
  }

  const columns = Object.keys(data[0]);
  const inserts = data.map((row) => {
    const values = columns
      .map((column) => {
        const value = row[column];
        if (value === null || value === undefined) {
          return 'NULL';
        }
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'object') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        return String(value);
      })
      .join(', ');

    return `INSERT INTO ${fallbackTableName} (${columns.join(', ')}) VALUES (${values});`;
  });

  const createTableLines = columns.map((column) => `  ${column} VARCHAR(255)`).join(',\n');
  const sections = [
    `-- Test data preview`,
    `-- ${inserts.length} rows`,
    '',
    `CREATE TABLE ${fallbackTableName} (`,
    createTableLines,
    ');',
    '',
    ...inserts,
  ];

  return {
    content: sections.join(lineEnding),
    language: 'sql' as const,
    filename: `${fallbackTableName}.sql`,
  };
};

export interface FormattedPreview {
  content: string;
  language: 'json' | 'csv' | 'sql';
  filename: string;
}

export const formatPreviewData = (
  data: Array<Record<string, unknown>>,
  format: ExportFormat,
  options: FormatPreviewOptions,
  tableName = 'test_data'
): FormattedPreview => {
  switch (format) {
    case 'JSON':
      return formatJson(data);
    case 'CSV':
      return formatCsv(data, options, 'preview');
    case 'SQL':
      return formatSql(data, options, tableName);
    case 'Excel':
      // For preview purposes we surface CSV content so users can copy quickly
      return formatCsv(data, options, 'preview');
    default:
      return formatJson(data);
  }
};
