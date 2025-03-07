'use client';

import { useState } from 'react';
import { SQLDialect } from '@/lib/types';
import { NetworkBackground } from '@/components/NetworkBackground';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  DocumentTextIcon, 
  InformationCircleIcon, 
  XMarkIcon,
  ArrowsRightLeftIcon,
  HomeIcon,
  BeakerIcon,
  CodeBracketIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { NavigationBar } from '@/components/NavigationBar';

// SQL Tool Modes
type SQLToolMode = 'generate' | 'validate' | 'convert';

// SQL Tool Tab Component
const SQLToolTab = ({ 
  mode, 
  activeMode, 
  setMode 
}: { 
  mode: SQLToolMode; 
  activeMode: SQLToolMode; 
  setMode: (mode: SQLToolMode) => void;
}) => {
  const isActive = mode === activeMode;
  const title = mode.charAt(0).toUpperCase() + mode.slice(1);
  
  return (
    <button
      onClick={() => setMode(mode)}
      className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-white/5 text-blue-100 hover:bg-white/10 border border-white/10 backdrop-blur-sm'
      }`}
    >
      {title}
    </button>
  );
};

// SQL Dialect Selector Component
const SQLDialectSelector = ({ 
  label,
  value, 
  onChange 
}: { 
  label: string;
  value: SQLDialect; 
  onChange: (dialect: SQLDialect) => void;
}) => {
  const dialects: SQLDialect[] = [
    'MySQL', 
    'PostgreSQL', 
    'SQLite', 
    'Oracle', 
    'SQL Server', 
    'BigQuery',
    'Snowflake'
  ];
  
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-blue-100">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SQLDialect)}
        className="bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238B9FDB' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: `right 0.5rem center`,
          backgroundRepeat: `no-repeat`,
          backgroundSize: `1.5em 1.5em`,
          paddingRight: `2.5rem`
        }}
      >
        {dialects.map((dialect) => (
          <option 
            key={dialect} 
            value={dialect}
            className="bg-slate-900 text-blue-50"
          >
            {dialect}
          </option>
        ))}
      </select>
    </div>
  );
};

// SQL Input Component
const SQLInput = ({ 
  value, 
  onChange, 
  placeholder,
  label
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string;
  label: string;
}) => {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-blue-100">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm placeholder:text-blue-200/30"
      />
    </div>
  );
};

// Schema Input Component
const SchemaInput = ({
  schema,
  setSchema,
  showSchema,
  setShowSchema,
  dialect,
  mode
}: {
  schema: string;
  setSchema: (value: string) => void;
  showSchema: boolean;
  setShowSchema: (value: boolean) => void;
  dialect: SQLDialect;
  mode: SQLToolMode;
}) => {
  const [isExtractionDialogOpen, setIsExtractionDialogOpen] = useState(false);
  const [schemaType, setSchemaType] = useState<'sql' | 'json'>('sql');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSchema(content || '');
      detectSchemaType(content || '');
    };
    reader.readAsText(file);
  };

  const detectSchemaType = (content: string) => {
    // Try to detect if the content is JSON
    try {
      const trimmed = content.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        // Parse it to make sure it's valid JSON
        JSON.parse(trimmed);
        setSchemaType('json');
        return;
      }
    } catch (e) {
      // Not valid JSON, assume SQL
    }
    setSchemaType('sql');
  };

  const handleSchemaChange = (value: string) => {
    setSchema(value);
    detectSchemaType(value);
  };

  // Get the appropriate usage message based on the current mode
  const getSchemaUsageMessage = () => {
    switch (mode) {
      case 'generate':
        return 'The AI will generate SQL queries that work with this schema.';
      case 'validate':
        return 'The AI will validate your SQL query against this schema.';
      case 'convert':
        return 'The schema is optional but can help with accurate SQL dialect conversion.';
      default:
        return 'Provide your database schema for more accurate results.';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h3 className="text-sm font-medium text-blue-100">Database Schema <span className="text-blue-300/70">(Optional)</span></h3>
          <div className="ml-2 text-xs text-blue-300/70 italic">
            {getSchemaUsageMessage()}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setIsExtractionDialogOpen(true)}
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
          >
            <InformationCircleIcon className="h-4 w-4 mr-1" />
            Get Schema from Database
          </button>
          
          <label className="text-sm text-blue-400 hover:text-blue-300 flex items-center cursor-pointer">
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            Upload Schema File
            <input
              type="file"
              accept=".sql,.json,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <label className="text-sm font-medium text-blue-100">
              Format: {schemaType === 'json' ? 'JSON' : 'SQL DDL'}
            </label>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              className={`text-xs px-2 py-1 rounded-md ${
                schemaType === 'sql' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/5 text-blue-100 hover:bg-white/10 border border-white/10'
              }`}
              onClick={() => setSchemaType('sql')}
            >
              SQL
            </button>
            <button
              type="button"
              className={`text-xs px-2 py-1 rounded-md ${
                schemaType === 'json' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/5 text-blue-100 hover:bg-white/10 border border-white/10'
              }`}
              onClick={() => setSchemaType('json')}
            >
              JSON
            </button>
          </div>
        </div>
        
        <textarea
          value={schema}
          onChange={(e) => handleSchemaChange(e.target.value)}
          placeholder={
            schemaType === 'json'
              ? '[\n  {\n    "Table": "users",\n    "Column": "id",\n    "Type": "int"\n  },\n  ...\n]'
              : 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  email VARCHAR(255)\n);\n\nCREATE TABLE orders (\n  id INT PRIMARY KEY,\n  user_id INT,\n  FOREIGN KEY (user_id) REFERENCES users(id)\n);'
          }
          className="w-full h-40 bg-slate-900/80 border border-white/10 text-blue-50 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm placeholder:text-blue-200/30"
        />
        
        <p className="text-xs text-blue-200">
          {schemaType === 'json'
            ? 'Provide your database schema in JSON format with Table, Column, and Type properties.'
            : 'Provide your database schema as SQL DDL statements (CREATE TABLE, etc.).'
          }
        </p>
      </div>
      
      {isExtractionDialogOpen && (
        <SchemaExtractionDialog
          isOpen={isExtractionDialogOpen}
          onClose={() => setIsExtractionDialogOpen(false)}
          dialect={dialect}
        />
      )}
    </div>
  );
};

// SQL Output Component
const SQLOutput = ({ 
  result, 
  isLoading, 
  error 
}: { 
  result: any; 
  isLoading: boolean; 
  error: string | null;
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // Function to copy content to clipboard
  const copyToClipboard = (content: string, section: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000); // Hide feedback after 2 seconds
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <LoadingAnimation message="Processing SQL query" />
        <p className="text-blue-100 mt-2">Processing...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col space-y-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center text-red-400">
          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
          <h3 className="font-medium">Error</h3>
        </div>
        <p className="text-blue-100">{error}</p>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <p className="text-blue-200">Results will appear here</p>
      </div>
    );
  }
  
  const hasError = result.error;
  
  return (
    <div className="flex flex-col space-y-4">
      {result.query && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-blue-100">SQL Query</h3>
            <Button
              onClick={() => copyToClipboard(result.query, 'query')}
              variant="primary"
              size="sm"
            >
              {copiedSection === 'query' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className={`relative ${hasError ? 'border-l-2 border-yellow-500 rounded-xl overflow-hidden' : 'rounded-xl overflow-hidden'}`}>
            <SyntaxHighlighter
              language="sql"
              style={atomDark}
              customStyle={{ 
                margin: 0, 
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {result.query}
            </SyntaxHighlighter>
          </div>
        </div>
      )}
      
      {hasError && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center text-yellow-400 mb-2">
            <ExclamationCircleIcon className="h-5 w-5 mr-2" />
            <h3 className="font-medium">Warning</h3>
          </div>
          <p className="text-blue-100">{result.error}</p>
          
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
            >
              {showDebug ? 'Hide' : 'Show'} Debugging Information
            </button>
            
            {showDebug && result.debug && (
              <div className="mt-2 text-xs bg-slate-900/80 p-3 rounded-xl overflow-x-auto text-blue-200 border border-white/10 backdrop-blur-sm">
                {result.debug.parseError && (
                  <p>Parse error: {result.debug.parseError}</p>
                )}
                {result.debug.extractionError && (
                  <p>Extraction error: {result.debug.extractionError}</p>
                )}
                {result.debug.rawResponse && (
                  <div className="mt-2">
                    <p className="text-blue-300 mb-1">Raw response:</p>
                    <pre className="whitespace-pre-wrap">{result.debug.rawResponse}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {result.explanation && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-blue-100">Explanation</h3>
            <Button
              onClick={() => copyToClipboard(result.explanation, 'explanation')}
              variant="primary"
              size="sm"
            >
              {copiedSection === 'explanation' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-xl text-blue-50 border border-white/10 backdrop-blur-sm">
            {result.explanation}
          </div>
        </div>
      )}
      
      {result.isValid !== undefined && (
        <div className="flex items-center">
          {result.isValid ? (
            <div className="flex items-center text-green-400">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span>Valid SQL query</span>
            </div>
          ) : (
            <div className="flex items-center text-red-400">
              <ExclamationCircleIcon className="h-5 w-5 mr-2" />
              <span>Invalid SQL query</span>
            </div>
          )}
        </div>
      )}
      
      {result.issues && result.issues.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-blue-100">Issues</h3>
            <Button
              onClick={() => copyToClipboard(
                result.issues.map((issue: any) => 
                  `${issue.type} (${issue.severity}): ${issue.description}${issue.suggestion ? `\nSuggestion: ${issue.suggestion}` : ''}`
                ).join('\n\n'),
                'issues'
              )}
              variant="primary"
              size="sm"
            >
              {copiedSection === 'issues' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <ul className="space-y-2">
            {result.issues.map((issue: any, index: number) => (
              <li key={index} className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    issue.severity === 'error' ? 'bg-red-500' :
                    issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></span>
                  <span className="font-medium text-blue-50">{issue.type}</span>
                  <span className="text-xs text-blue-200 ml-2">({issue.severity})</span>
                </div>
                <p className="text-blue-100 mt-1">{issue.description}</p>
                {issue.suggestion && (
                  <p className="text-blue-200 mt-1 text-sm">Suggestion: {issue.suggestion}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {result.dialectDifferences && result.dialectDifferences.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-blue-100">Dialect Differences</h3>
            <Button
              onClick={() => copyToClipboard(result.dialectDifferences.join('\n'), 'dialectDifferences')}
              variant="primary"
              size="sm"
            >
              {copiedSection === 'dialectDifferences' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <ul className="list-disc list-inside text-blue-100 space-y-1 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
            {result.dialectDifferences.map((diff: string, index: number) => (
              <li key={index}>{diff}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Schema Extraction Dialog Component
const SchemaExtractionDialog = ({
  isOpen,
  onClose,
  dialect
}: {
  isOpen: boolean;
  onClose: () => void;
  dialect: SQLDialect;
}) => {
  const [copied, setCopied] = useState(false);
  
  // Get the appropriate extraction query for the selected dialect
  const extractionQueries = {
    'MySQL': {
      query: `SELECT 
  TABLE_NAME as \`Table\`, 
  COLUMN_NAME as \`Column\`, 
  DATA_TYPE as \`Type\` 
FROM 
  INFORMATION_SCHEMA.COLUMNS 
WHERE 
  TABLE_SCHEMA = DATABASE() 
ORDER BY 
  TABLE_NAME, ORDINAL_POSITION;`,
      note: null
    },
    'PostgreSQL': {
      query: `SELECT 
  t.table_name as "Table", 
  c.column_name as "Column", 
  c.data_type as "Type"
FROM 
  information_schema.tables t
JOIN 
  information_schema.columns c ON t.table_name = c.table_name
WHERE 
  t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY 
  t.table_name, c.ordinal_position;`,
      note: null
    },
    'SQLite': {
      query: `WITH tables AS (
  SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
)
SELECT 
  tables.name AS "Table",
  pragma_table_info(tables.name) AS table_info,
  json_extract(table_info, '$.name') AS "Column",
  json_extract(table_info, '$.type') AS "Type"
FROM 
  tables;`,
      note: "SQLite doesn't have an INFORMATION_SCHEMA. This query uses SQLite-specific PRAGMA functions to extract schema information."
    },
    'Oracle': {
      query: `SELECT 
  t.table_name as "Table", 
  c.column_name as "Column", 
  c.data_type as "Type"
FROM 
  user_tables t
JOIN 
  user_tab_columns c ON t.table_name = c.table_name
ORDER BY 
  t.table_name, c.column_id;`,
      note: null
    },
    'SQL Server': {
      query: `SELECT 
  t.name as [Table], 
  c.name as [Column], 
  ty.name as [Type]
FROM 
  sys.tables t
JOIN 
  sys.columns c ON t.object_id = c.object_id
JOIN 
  sys.types ty ON c.user_type_id = ty.user_type_id
ORDER BY 
  t.name, c.column_id;`,
      note: null
    },
    'BigQuery': {
      query: `SELECT
  table_name as \`Table\`,
  column_name as \`Column\`,
  data_type as \`Type\`
FROM
  \`PROJECT_ID\`.DATASET_NAME.INFORMATION_SCHEMA.COLUMNS
ORDER BY
  table_name, ordinal_position;`,
      note: "Replace PROJECT_ID and DATASET_NAME with your actual project ID and dataset name."
    },
    'Snowflake': {
      query: `SELECT
  table_name as "Table",
  column_name as "Column",
  data_type as "Type"
FROM
  information_schema.columns
WHERE
  table_schema = 'YOUR_SCHEMA'
ORDER BY
  table_name, ordinal_position;`,
      note: "Replace YOUR_SCHEMA with your actual schema name."
    }
  };
  
  const currentQuery = extractionQueries[dialect];
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentQuery.query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white/10 rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col border border-white/20">
        <div className="flex justify-between items-center p-4 border-b border-white/20">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-400" />
            Extract Schema from {dialect} Database
          </h3>
          <button 
            onClick={onClose}
            className="text-blue-200 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-auto flex-grow">
          <p className="text-blue-100 mb-4">
            Run the following query in your {dialect} database to extract the schema structure in JSON format:
          </p>
          
          <div className="relative">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm font-mono text-sm text-blue-50 overflow-x-auto">
              {currentQuery.query}
            </div>
            <button 
              onClick={copyToClipboard} 
              className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-xs"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          {currentQuery.note && (
            <div className="mt-4 bg-blue-900/30 border border-blue-800/30 rounded-xl p-3 text-blue-100">
              <p className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{currentQuery.note}</span>
              </p>
            </div>
          )}
          
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <h4 className="text-md font-medium text-white mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-2 text-blue-100">
              <li>Run this query in your database to get schema information in JSON format</li>
              <li>Copy the JSON result from your database query tool</li>
              <li>Paste it into the Schema input field in this application</li>
              <li>The AI will use this schema to generate more accurate SQL queries</li>
            </ol>
          </div>
        </div>
        
        <div className="p-4 border-t border-white/20 flex justify-end">
          <Button 
            onClick={onClose}
            variant="primary"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main SQL Tool Page Component
export default function SQLToolPage() {
  const [mode, setMode] = useState<SQLToolMode>('generate');
  
  // Define interfaces for each mode's state
  interface GenerateState {
    description: string;
    targetDialect: SQLDialect;
    showSchema: boolean;
    schema: string;
    result: any;
    error: string | null;
    isLoading: boolean;
  }
  
  interface ValidateState {
    query: string;
    targetDialect: SQLDialect;
    showSchema: boolean;
    schema: string;
    result: any;
    error: string | null;
    isLoading: boolean;
  }
  
  interface ConvertState {
    query: string;
    sourceDialect: SQLDialect;
    targetDialect: SQLDialect;
    result: any;
    error: string | null;
    isLoading: boolean;
  }
  
  // Union type for all possible states
  type ModeState = GenerateState | ValidateState | ConvertState;
  
  // Separate state for each mode
  const [generateState, setGenerateState] = useState<GenerateState>({
    description: '',
    targetDialect: 'MySQL',
    showSchema: false,
    schema: '',
    result: null,
    error: null,
    isLoading: false
  });
  
  const [validateState, setValidateState] = useState<ValidateState>({
    query: '',
    targetDialect: 'MySQL',
    showSchema: false,
    schema: '',
    result: null,
    error: null,
    isLoading: false
  });
  
  const [convertState, setConvertState] = useState<ConvertState>({
    query: '',
    sourceDialect: 'MySQL',
    targetDialect: 'PostgreSQL',
    result: null,
    error: null,
    isLoading: false
  });
  
  // Helper functions to get current state based on mode
  const getCurrentState = (): ModeState => {
    switch (mode) {
      case 'generate': return generateState;
      case 'validate': return validateState;
      case 'convert': return convertState;
      default: return generateState;
    }
  };
  
  // Get current state
  const currentState = getCurrentState();
  
  // Extract values from current state with proper type checking
  const description = 'description' in currentState ? currentState.description : '';
  const query = 'query' in currentState ? currentState.query : '';
  const sourceDialect = 'sourceDialect' in currentState ? currentState.sourceDialect : 'MySQL';
  const targetDialect = currentState.targetDialect;
  const showSchema = 'showSchema' in currentState ? currentState.showSchema : false;
  const schema = 'schema' in currentState ? currentState.schema : '';
  const result = currentState.result;
  const error = currentState.error;
  const isLoading = currentState.isLoading;
  
  // Update state based on current mode
  const updateCurrentState = <T extends Partial<ModeState>>(updates: T) => {
    switch (mode) {
      case 'generate':
        setGenerateState(prev => ({ ...prev, ...updates } as GenerateState));
        break;
      case 'validate':
        setValidateState(prev => ({ ...prev, ...updates } as ValidateState));
        break;
      case 'convert':
        setConvertState(prev => ({ ...prev, ...updates } as ConvertState));
        break;
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    updateCurrentState({ isLoading: true, error: null });
    
    try {
      let endpoint = '';
      let payload = {};
      
      switch (mode) {
        case 'generate':
          endpoint = '/api/sql/generate';
          payload = { 
            description, 
            targetDialect,
            schema: showSchema ? schema : undefined
          };
          break;
        case 'validate':
          endpoint = '/api/sql/validate';
          payload = { 
            query, 
            dialect: targetDialect,
            schema: showSchema ? schema : undefined
          };
          break;
        case 'convert':
          endpoint = '/api/sql/convert';
          payload = { query, sourceDialect, targetDialect };
          break;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        updateCurrentState({ result: data });
      } else {
        updateCurrentState({ error: data.error || 'An error occurred' });
      }
    } catch (err) {
      updateCurrentState({ error: 'Failed to process request' });
      console.error('Error:', err);
    } finally {
      updateCurrentState({ isLoading: false });
    }
  };
  
  // Handle mode change - just change the mode, don't reset state
  const handleModeChange = (newMode: SQLToolMode) => {
    setMode(newMode);
  };
  
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header - simplified without the switch button */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
            SQL AI Assistant
          </h1>
          <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
            Generate, validate, and convert SQL queries using AI
          </p>
        </div>
        
        {/* Tool Tabs */}
        <div className="flex justify-center space-x-2 mb-6">
          <SQLToolTab mode="generate" activeMode={mode} setMode={handleModeChange} />
          <SQLToolTab mode="validate" activeMode={mode} setMode={handleModeChange} />
          <SQLToolTab mode="convert" activeMode={mode} setMode={handleModeChange} />
        </div>
        
        {/* Tool Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <div className="space-y-6">
            {/* Generate Mode */}
            {mode === 'generate' && (
              <>
                <SQLInput
                  value={description}
                  onChange={(value) => updateCurrentState({ description: value })}
                  placeholder="Describe the SQL query you need (e.g., 'Find all customers who made a purchase in the last 30 days and sort by total amount spent')"
                  label="Query Description"
                />
                <SQLDialectSelector
                  label="Target SQL Dialect"
                  value={targetDialect}
                  onChange={(dialect) => updateCurrentState({ targetDialect: dialect })}
                />
              </>
            )}
            
            {/* Validate Mode */}
            {mode === 'validate' && (
              <>
                <SQLInput
                  value={query}
                  onChange={(value) => updateCurrentState({ query: value })}
                  placeholder="Enter your SQL query to validate"
                  label="SQL Query"
                />
                <SQLDialectSelector
                  label="SQL Dialect"
                  value={targetDialect}
                  onChange={(dialect) => updateCurrentState({ targetDialect: dialect })}
                />
              </>
            )}
            
            {/* Convert Mode */}
            {mode === 'convert' && (
              <>
                <SQLInput
                  value={query}
                  onChange={(value) => updateCurrentState({ query: value })}
                  placeholder="Enter your SQL query to convert"
                  label="SQL Query"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SQLDialectSelector
                    label="Source SQL Dialect"
                    value={sourceDialect}
                    onChange={(dialect) => updateCurrentState({ sourceDialect: dialect })}
                  />
                  <SQLDialectSelector
                    label="Target SQL Dialect"
                    value={targetDialect}
                    onChange={(dialect) => updateCurrentState({ targetDialect: dialect })}
                  />
                </div>
              </>
            )}
            
            {/* Schema Input - show for generate and validate modes only */}
            {mode !== 'convert' && (
              <SchemaInput
                schema={schema}
                setSchema={(value) => updateCurrentState({ schema: value })}
                showSchema={true}
                setShowSchema={(value) => updateCurrentState({ showSchema: value })}
                dialect={targetDialect}
                mode={mode}
              />
            )}
            
            {/* Action Button - removed reset button */}
            <div className="flex">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                variant="primary"
                size="md"
                isLoading={isLoading}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            </div>
            
            {/* Results */}
            {(result || isLoading || error) && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4 text-blue-100">Results</h2>
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
                  <SQLOutput result={result} isLoading={isLoading} error={error} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 