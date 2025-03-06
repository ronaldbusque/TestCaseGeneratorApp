export type SQLDialect = 
  | 'MySQL' 
  | 'PostgreSQL' 
  | 'SQLite' 
  | 'Oracle' 
  | 'SQL Server' 
  | 'BigQuery'
  | 'Snowflake';

export interface SQLGenerationRequest {
  description: string;
  targetDialect: SQLDialect;
  schema?: string; // Database schema definition (optional)
}

export interface SQLValidationRequest {
  query: string;
  dialect: SQLDialect;
  schema?: string; // Optional database schema definition
}

export interface SQLConversionRequest {
  query: string;
  sourceDialect: SQLDialect;
  targetDialect: SQLDialect;
}

export interface SQLResponse {
  query: string;
  explanation?: string;
  error?: string;
  suggestedFixes?: string[];
  debug?: {
    rawResponse?: string;
    content?: string;
    cleanedContent?: string;
    parseError?: string;
    extractionError?: string;
    cleaningError?: string;
  };
}

export interface SQLValidationResponse extends SQLResponse {
  isValid: boolean;
  issues?: SQLIssue[];
}

export interface SQLIssue {
  type: 'syntax' | 'performance' | 'security' | 'style' | 'schema' | 'other';
  description: string;
  location?: string; // Line/column information
  severity: 'info' | 'warning' | 'error';
  suggestion?: string;
}

export interface SQLConversionResponse extends SQLResponse {
  originalQuery: string;
  convertedQuery: string;
  dialectDifferences?: string[];
} 