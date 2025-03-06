'use client';

import { useState } from 'react';
import { SQLDialect } from '@/lib/types';
import { NetworkBackground } from '@/components/NetworkBackground';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon, DocumentTextIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

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
      className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors duration-200 ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SQLDialect)}
        className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {dialects.map((dialect) => (
          <option key={dialect} value={dialect}>
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-3 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  dialect
}: {
  schema: string;
  setSchema: (value: string) => void;
  showSchema: boolean;
  setShowSchema: (value: boolean) => void;
  dialect: SQLDialect;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowSchema(!showSchema)}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <DocumentTextIcon className="h-5 w-5" />
          <span>{showSchema ? 'Hide Schema' : 'Add Database Schema (Optional)'}</span>
        </button>
        
        {showSchema && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsExtractionDialogOpen(true)}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <InformationCircleIcon className="h-4 w-4" />
              <span>Get Schema from Database</span>
            </button>
            <label className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
              <input
                type="file"
                accept=".sql,.txt,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              Upload Schema File
            </label>
          </div>
        )}
      </div>
      
      {showSchema && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300">
              Database Schema
            </label>
            <div className="text-xs text-slate-400">
              Format detected: {schemaType === 'json' ? 'JSON Schema' : 'SQL DDL'}
            </div>
          </div>
          
          <textarea
            value={schema}
            onChange={(e) => handleSchemaChange(e.target.value)}
            placeholder={schemaType === 'json' 
              ? "Paste your JSON schema data here (from database extraction query)"
              : "Paste your database schema here (CREATE TABLE statements, etc.)"}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-3 py-2 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex text-xs text-slate-400">
            <p className="flex-grow">
              {schemaType === 'json' 
                ? "JSON schema from database extraction is detected. The AI will use this information for generating accurate queries."
                : "Providing schema information helps generate more accurate SQL queries that match your database structure."}
            </p>
          </div>
        </div>
      )}
      
      <SchemaExtractionDialog 
        isOpen={isExtractionDialogOpen}
        onClose={() => setIsExtractionDialogOpen(false)}
        dialect={dialect}
      />
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
      <div className="flex flex-col items-center justify-center h-40 bg-slate-800 border border-slate-700 rounded-md p-4">
        <LoadingAnimation message="Processing SQL query" />
        <p className="text-slate-300 mt-2">Processing...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col space-y-2 bg-slate-800 border border-red-700 rounded-md p-4">
        <div className="flex items-center text-red-500">
          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
          <h3 className="font-medium">Error</h3>
        </div>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-slate-800 border border-slate-700 rounded-md p-4">
        <p className="text-slate-400">Results will appear here</p>
      </div>
    );
  }
  
  const hasError = result.error;
  
  return (
    <div className="flex flex-col space-y-4 bg-slate-800 border border-slate-700 rounded-md p-4">
      {result.query && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-300">SQL Query</h3>
            <button
              onClick={() => copyToClipboard(result.query, 'query')}
              className="flex items-center space-x-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              <span>{copiedSection === 'query' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className={`relative ${hasError ? 'border-l-2 border-yellow-500 rounded-md overflow-hidden' : 'rounded-md overflow-hidden'}`}>
            <SyntaxHighlighter
              language="sql"
              style={atomDark}
              customStyle={{ 
                margin: 0, 
                borderRadius: '0.375rem',
                background: 'rgb(15, 23, 42)' // tailwind slate-900
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
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-md p-3">
          <div className="flex items-center text-yellow-500 mb-2">
            <ExclamationCircleIcon className="h-5 w-5 mr-2" />
            <h3 className="font-medium">Warning</h3>
          </div>
          <p className="text-slate-300">{result.error}</p>
          
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
            >
              {showDebug ? 'Hide' : 'Show'} Debugging Information
            </button>
            
            {showDebug && result.debug && (
              <div className="mt-2 text-xs bg-slate-900 p-2 rounded-md overflow-x-auto text-slate-400">
                {result.debug.parseError && (
                  <p>Parse error: {result.debug.parseError}</p>
                )}
                {result.debug.extractionError && (
                  <p>Extraction error: {result.debug.extractionError}</p>
                )}
                {result.debug.rawResponse && (
                  <div className="mt-2">
                    <p className="text-slate-500 mb-1">Raw response:</p>
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
            <h3 className="text-sm font-medium text-slate-300">Explanation</h3>
            <button
              onClick={() => copyToClipboard(result.explanation, 'explanation')}
              className="flex items-center space-x-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              <span>{copiedSection === 'explanation' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="bg-slate-900 p-3 rounded-md text-slate-200">
            {result.explanation}
          </div>
        </div>
      )}
      
      {result.isValid !== undefined && (
        <div className="flex items-center">
          {result.isValid ? (
            <div className="flex items-center text-green-500">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span>Valid SQL query</span>
            </div>
          ) : (
            <div className="flex items-center text-red-500">
              <ExclamationCircleIcon className="h-5 w-5 mr-2" />
              <span>Invalid SQL query</span>
            </div>
          )}
        </div>
      )}
      
      {result.issues && result.issues.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-300">Issues</h3>
            <button
              onClick={() => copyToClipboard(
                result.issues.map((issue: any) => 
                  `${issue.type} (${issue.severity}): ${issue.description}${issue.suggestion ? `\nSuggestion: ${issue.suggestion}` : ''}`
                ).join('\n\n'),
                'issues'
              )}
              className="flex items-center space-x-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              <span>{copiedSection === 'issues' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <ul className="space-y-2">
            {result.issues.map((issue: any, index: number) => (
              <li key={index} className="bg-slate-900 p-3 rounded-md">
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    issue.severity === 'error' ? 'bg-red-500' :
                    issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></span>
                  <span className="font-medium text-slate-200">{issue.type}</span>
                  <span className="text-xs text-slate-400 ml-2">({issue.severity})</span>
                </div>
                <p className="text-slate-300 mt-1">{issue.description}</p>
                {issue.suggestion && (
                  <p className="text-slate-400 mt-1 text-sm">Suggestion: {issue.suggestion}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {result.dialectDifferences && result.dialectDifferences.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-300">Dialect Differences</h3>
            <button
              onClick={() => copyToClipboard(result.dialectDifferences.join('\n'), 'dialectDifferences')}
              className="flex items-center space-x-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              <span>{copiedSection === 'dialectDifferences' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <ul className="list-disc list-inside text-slate-300 space-y-1 bg-slate-900 p-3 rounded-md">
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
  // Skip if not open
  if (!isOpen) return null;
  
  const extractionQueries: Record<SQLDialect, { query: string; note?: string }> = {
    'PostgreSQL': {
      query: `SELECT json_agg(row_to_json(t))
FROM (
  SELECT
    TABLE_NAME as "Table",
    COLUMN_NAME as "Column",
    DATA_TYPE as "Type"
  FROM
    INFORMATION_SCHEMA.COLUMNS
  WHERE
    TABLE_SCHEMA = 'public'
  ORDER BY
    TABLE_NAME
) t;`
    },
    'MySQL': {
      query: `SELECT JSON_ARRAYAGG(JSON_OBJECT(
  'Table', TABLE_NAME,
  'Column', COLUMN_NAME,
  'Type', DATA_TYPE
))
FROM (
  SELECT
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE
  FROM
    INFORMATION_SCHEMA.COLUMNS
  WHERE
    TABLE_SCHEMA = 'YOUR_DATABASE_NAME' -- Replace with your DB name
  ORDER BY
    TABLE_NAME
) t;`,
      note: "Replace 'YOUR_DATABASE_NAME' with your actual database name."
    },
    'Oracle': {
      query: `SELECT
  JSON_ARRAYAGG (
    JSON_OBJECT (
      'Table' VALUE TABLE_NAME,
      'Column' VALUE COLUMN_NAME,
      'Type' VALUE DATA_TYPE
    )
  ) AS json_result
FROM
  ALL_TAB_COLUMNS
WHERE
  OWNER = 'ADMIN'; -- Replace with your schema owner`,
      note: "Replace 'ADMIN' with your schema owner."
    },
    'SQL Server': {
      query: `SELECT
(
  SELECT
    TABLE_NAME AS [Table],
    COLUMN_NAME AS [Column],
    DATA_TYPE AS [Type]
  FROM
    INFORMATION_SCHEMA.COLUMNS
  WHERE
    TABLE_SCHEMA = 'dbo' -- Replace with your schema
  ORDER BY
    TABLE_NAME FOR JSON PATH
) AS json_result;`,
      note: "Replace 'dbo' with your schema name if different."
    },
    'BigQuery': {
      query: `SELECT TO_JSON_STRING(ARRAY_AGG(t))
FROM (
  SELECT
    table_name AS Table,
    column_name AS Column,
    data_type AS Type
  FROM
    \`project_id.dataset.INFORMATION_SCHEMA.COLUMNS\`
  WHERE
    table_schema = 'public'
  ORDER BY
    table_name
) t;`,
      note: "Replace 'project_id.dataset' with your actual project and dataset."
    },
    'SQLite': {
      query: `SELECT
  json_group_array (
    json_object ('Table', table_name, 'Column', name, 'Type', type)
  ) AS json_result
FROM
  (
    SELECT
      m.name AS table_name,
      p.name,
      p.type
    FROM
      sqlite_master m
      JOIN pragma_table_info (m.name) p
    WHERE
      m.type = 'table'
    ORDER BY
      m.name
  );`
    },
    'Snowflake': {
      query: `SELECT
  ARRAY_AGG(
    OBJECT_CONSTRUCT(
      'Table',
      TABLE_NAME,
      'Column',
      COLUMN_NAME,
      'Type',
      DATA_TYPE
    )
  ) AS json_agg
FROM
  (
    SELECT
      TABLE_NAME,
      COLUMN_NAME,
      DATA_TYPE
    FROM
      INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = 'PUBLIC'
    ORDER BY
      TABLE_NAME
  ) t;`,
      note: "Replace 'PUBLIC' with your schema name if different."
    }
  };
  
  const currentQuery = extractionQueries[dialect] || extractionQueries['PostgreSQL'];
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentQuery.query);
  };
  
  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-400" />
            Schema Extraction Query for {dialect}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-auto flex-grow">
          <p className="text-slate-300 mb-4">
            Run the following query in your {dialect} database to extract the schema structure in JSON format:
          </p>
          
          <div className="relative rounded-md overflow-hidden">
            <SyntaxHighlighter
              language="sql"
              style={atomDark}
              customStyle={{ 
                margin: 0, 
                borderRadius: '0.375rem',
                background: 'rgb(15, 23, 42)' // tailwind slate-900
              }}
              wrapLines={true}
              wrapLongLines={true}
            >
              {currentQuery.query}
            </SyntaxHighlighter>
            <button 
              onClick={copyToClipboard} 
              className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-md text-xs"
            >
              Copy
            </button>
          </div>
          
          {currentQuery.note && (
            <div className="mt-4 bg-blue-900/30 border border-blue-800/30 rounded-md p-3 text-slate-300">
              <p className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{currentQuery.note}</span>
              </p>
            </div>
          )}
          
          <div className="mt-6 bg-slate-700/30 border border-slate-600/30 rounded-md p-4">
            <h4 className="text-md font-medium text-white mb-2">How to use:</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Run this query in your database to get schema information in JSON format</li>
              <li>Copy the JSON result from your database query tool</li>
              <li>Paste it into the Schema input box on this page</li>
              <li>The system will automatically detect and process the JSON schema format</li>
            </ol>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main SQL Tool Page Component
export default function SQLToolPage() {
  // State
  const [mode, setMode] = useState<SQLToolMode>('generate');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [targetDialect, setTargetDialect] = useState<SQLDialect>('PostgreSQL');
  const [sourceDialect, setSourceDialect] = useState<SQLDialect>('MySQL');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [schema, setSchema] = useState('');
  
  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
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
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to process request');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset form
  const handleReset = () => {
    setDescription('');
    setQuery('');
    setResult(null);
    setError(null);
    setShowSchema(false);
    setSchema('');
  };
  
  // Handle mode change
  const handleModeChange = (newMode: SQLToolMode) => {
    setMode(newMode);
    setResult(null);
    setError(null);
    
    // Hide schema input when switching to convert mode
    if (newMode === 'convert') {
      setShowSchema(false);
    }
  };
  
  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <NetworkBackground />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">SQL AI Assistant</h1>
        <p className="text-slate-400 mb-8">Generate, validate, and convert SQL queries using AI</p>
        
        {/* Tool Tabs */}
        <div className="flex space-x-2 mb-6">
          <SQLToolTab mode="generate" activeMode={mode} setMode={handleModeChange} />
          <SQLToolTab mode="validate" activeMode={mode} setMode={handleModeChange} />
          <SQLToolTab mode="convert" activeMode={mode} setMode={handleModeChange} />
        </div>
        
        {/* Tool Content */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <div className="space-y-6">
            {/* Generate Mode */}
            {mode === 'generate' && (
              <>
                <SQLInput
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the SQL query you need (e.g., 'Find all customers who made a purchase in the last 30 days and sort by total amount spent')"
                  label="Query Description"
                />
                <SQLDialectSelector
                  label="Target SQL Dialect"
                  value={targetDialect}
                  onChange={setTargetDialect}
                />
              </>
            )}
            
            {/* Validate Mode */}
            {mode === 'validate' && (
              <>
                <SQLInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Enter your SQL query to validate"
                  label="SQL Query"
                />
                <SQLDialectSelector
                  label="SQL Dialect"
                  value={targetDialect}
                  onChange={setTargetDialect}
                />
              </>
            )}
            
            {/* Convert Mode */}
            {mode === 'convert' && (
              <>
                <SQLInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Enter your SQL query to convert"
                  label="SQL Query"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SQLDialectSelector
                    label="Source SQL Dialect"
                    value={sourceDialect}
                    onChange={setSourceDialect}
                  />
                  <SQLDialectSelector
                    label="Target SQL Dialect"
                    value={targetDialect}
                    onChange={setTargetDialect}
                  />
                </div>
              </>
            )}
            
            {/* Schema Input - only show for generate and validate modes */}
            {mode !== 'convert' && (
              <SchemaInput
                schema={schema}
                setSchema={setSchema}
                showSchema={showSchema}
                setShowSchema={setShowSchema}
                dialect={targetDialect}
              />
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : `${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
              </button>
              <button
                onClick={handleReset}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
            
            {/* Results */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Results</h2>
              <SQLOutput result={result} isLoading={isLoading} error={error} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 