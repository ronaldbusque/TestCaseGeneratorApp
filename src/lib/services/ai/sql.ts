import { AIService } from '@/lib/types';
import { 
  SQLDialect, 
  SQLGenerationRequest, 
  SQLValidationRequest, 
  SQLConversionRequest,
  SQLResponse,
  SQLValidationResponse,
  SQLConversionResponse,
  SQLIssue
} from '@/lib/types';

export class SQLAIService {
  private aiService: AIService; // Add private member for the core AI service

  // Inject AIService via constructor
  constructor(aiService: AIService) {
    this.aiService = aiService;
    console.log('[SQLAIService] initialized with underlying AI Service:', { serviceType: aiService.constructor.name });
  }

  async generateSQLQuery(request: SQLGenerationRequest): Promise<SQLResponse> {
    const { description, targetDialect, schema } = request;
    console.log('[SQLAIService] Generating SQL Query', { targetDialect, descriptionLength: description.length, schemaProvided: !!schema });
    
    try {
      // Process schema if available
      let processedSchema = '';
      let schemaFormat = 'sql';
      
      if (schema) {
        // Detect if schema is in JSON format
        try {
          const trimmedSchema = schema.trim();
          if ((trimmedSchema.startsWith('[') && trimmedSchema.endsWith(']')) || 
              (trimmedSchema.startsWith('{') && trimmedSchema.endsWith('}'))) {
            
            // Parse JSON schema
            let jsonSchema;
            try {
              jsonSchema = JSON.parse(trimmedSchema);
              schemaFormat = 'json';
              
              // Handle both array and single object
              const schemaArray = Array.isArray(jsonSchema) ? jsonSchema : 
                                 (jsonSchema.json_result ? JSON.parse(jsonSchema.json_result) : 
                                 (jsonSchema.json_agg ? jsonSchema.json_agg : [jsonSchema]));
              
              // Group tables
              const tableMap = new Map<string, Array<{columnName: string, dataType: string}>>();
              
              if (Array.isArray(schemaArray)) {
                schemaArray.forEach(item => {
                  const tableName = item.Table || item.table;
                  const columnName = item.Column || item.column;
                  const dataType = item.Type || item.type;
                  
                  if (tableName && columnName && dataType) {
                    if (!tableMap.has(tableName)) {
                      tableMap.set(tableName, []);
                    }
                    tableMap.get(tableName)?.push({ columnName, dataType });
                  }
                });
                
                // Convert to SQL DDL-like format for the AI
                const createTableStatements: string[] = [];
                
                tableMap.forEach((columns, tableName) => {
                  const columnsText = columns.map(col => `  ${col.columnName} ${col.dataType}`).join(',\n');
                  createTableStatements.push(`CREATE TABLE ${tableName} (\n${columnsText}\n);`);
                });
                
                processedSchema = createTableStatements.join('\n\n');
              }
            } catch (parseError) {
              console.error('Failed to parse JSON schema:', parseError);
              processedSchema = schema; // Use original if parsing fails
              schemaFormat = 'sql';
            }
          } else {
            // Not JSON, assume SQL DDL
            processedSchema = schema;
          }
        } catch (e) {
          // Not JSON, use original
          processedSchema = schema;
        }
      }
      
      const prompt = `
You are an expert SQL developer. Generate a SQL query for the ${targetDialect} dialect based on the following description:

${description}

${processedSchema ? `Use the following database schema:
\`\`\`
${processedSchema}
\`\`\`

${schemaFormat === 'json' ? 'This schema was derived from database metadata in JSON format and converted to table definitions for your reference.' : ''}` : ''}

Your response should be a valid SQL query that accomplishes the task described.
IMPORTANT: Your response MUST be a valid JSON object with the following structure and nothing else:
{
  "query": "The SQL query",
  "explanation": "A detailed explanation of how the query works"
}

DO NOT wrap your response in markdown code blocks or any other formatting. Return ONLY the JSON object.
`;

      console.log("=== SQL GENERATION PROMPT ===");
      console.log(prompt);
      console.log("============================");

      const response = await this.aiService.generateContent(prompt);
      
      console.log("=== SQL GENERATION RAW RESPONSE ===");
      console.log(response);
      console.log("==================================");
      
      try {
        // First attempt: Direct JSON parsing
        const parsedResponse = JSON.parse(response);
        return {
          query: parsedResponse.query,
          explanation: parsedResponse.explanation
        };
      } catch (parseError) {
        // Second attempt: Remove markdown code blocks
        try {
          // Remove markdown code block syntax
          const cleanedResponse = response.replace(/```(json|javascript|js)?\s+/g, '').replace(/\s*```\s*$/g, '');
          
          // Try parsing the cleaned response
          const parsedResponse = JSON.parse(cleanedResponse);
          
          return {
            query: parsedResponse.query,
            explanation: parsedResponse.explanation,
            debug: {
              rawResponse: response,
              cleanedContent: cleanedResponse
            }
          };
        } catch (cleaningError) {
          // Third attempt: Try to extract JSON using regex
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonString = jsonMatch[0];
              const extractedJson = JSON.parse(jsonString);
              
              return {
                query: extractedJson.query,
                explanation: extractedJson.explanation,
                debug: {
                  rawResponse: response,
                  cleanedContent: jsonString
                }
              };
            }
            
            // Fourth attempt: Extract query directly
            const queryMatch = response.match(/(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|MERGE|WITH)[\s\S]*?(?:;|\n\n|$)/i);
            if (queryMatch) {
              return {
                query: queryMatch[0].trim(),
                explanation: "Extracted from unstructured response",
                error: "Response format issue - explanation may be incomplete",
                debug: {
                  rawResponse: response,
                  parseError: parseError instanceof Error ? parseError.message : String(parseError),
                  cleaningError: cleaningError instanceof Error ? cleaningError.message : String(cleaningError)
                }
              };
            }
            
            throw new Error("Could not extract valid SQL query from response");
          } catch (extractionError) {
            return {
              query: "",
              error: "Invalid response format",
              debug: {
                rawResponse: response,
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                cleaningError: cleaningError instanceof Error ? cleaningError.message : String(cleaningError),
                extractionError: extractionError instanceof Error ? extractionError.message : String(extractionError)
              }
            };
          }
        }
      }
    } catch (error) {
      console.error("Error generating SQL query:", error);
      return {
        query: "",
        error: "Failed to generate SQL query",
        debug: {
          parseError: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  async validateSQLQuery(request: SQLValidationRequest): Promise<SQLValidationResponse> {
    const { query, dialect, schema } = request;
    console.log('[SQLAIService] Validating SQL Query', { dialect, queryLength: query.length, schemaProvided: !!schema });
    
    try {
      // Process schema if available
      let processedSchema = '';
      let schemaFormat = 'sql';
      
      if (schema) {
        // Detect if schema is in JSON format
        try {
          const trimmedSchema = schema.trim();
          if ((trimmedSchema.startsWith('[') && trimmedSchema.endsWith(']')) || 
              (trimmedSchema.startsWith('{') && trimmedSchema.endsWith('}'))) {
            
            // Parse JSON schema
            let jsonSchema;
            try {
              jsonSchema = JSON.parse(trimmedSchema);
              schemaFormat = 'json';
              
              // Handle both array and single object
              const schemaArray = Array.isArray(jsonSchema) ? jsonSchema : 
                                 (jsonSchema.json_result ? JSON.parse(jsonSchema.json_result) : 
                                 (jsonSchema.json_agg ? jsonSchema.json_agg : [jsonSchema]));
              
              // Group tables
              const tableMap = new Map<string, Array<{columnName: string, dataType: string}>>();
              
              if (Array.isArray(schemaArray)) {
                schemaArray.forEach(item => {
                  const tableName = item.Table || item.table;
                  const columnName = item.Column || item.column;
                  const dataType = item.Type || item.type;
                  
                  if (tableName && columnName && dataType) {
                    if (!tableMap.has(tableName)) {
                      tableMap.set(tableName, []);
                    }
                    tableMap.get(tableName)?.push({ columnName, dataType });
                  }
                });
                
                // Convert to SQL DDL-like format for the AI
                const createTableStatements: string[] = [];
                
                tableMap.forEach((columns, tableName) => {
                  const columnsText = columns.map(col => `  ${col.columnName} ${col.dataType}`).join(',\n');
                  createTableStatements.push(`CREATE TABLE ${tableName} (\n${columnsText}\n);`);
                });
                
                processedSchema = createTableStatements.join('\n\n');
              }
            } catch (parseError) {
              console.error('Failed to parse JSON schema:', parseError);
              processedSchema = schema; // Use original if parsing fails
              schemaFormat = 'sql';
            }
          } else {
            // Not JSON, assume SQL DDL
            processedSchema = schema;
          }
        } catch (e) {
          // Not JSON, use original
          processedSchema = schema;
        }
      }
      
      const prompt = `
You are an expert SQL developer. Analyze the following SQL query for the ${dialect} dialect and validate it.

SQL Query:
\`\`\`sql
${query}
\`\`\`

${processedSchema ? `Database Schema (for reference only - do NOT critique the schema itself):
\`\`\`
${processedSchema}
\`\`\`
${schemaFormat === 'json' ? 'This schema was derived from database metadata in JSON format and converted to table definitions for your reference.' : ''}` : ''}

Please identify any issues with the SQL QUERY ONLY (not the schema) related to:
1. Syntax errors
2. Performance concerns
3. Security issues (SQL injection vulnerabilities, etc.)
4. Style/best practices
${processedSchema ? '5. Schema compatibility (check if tables and columns referenced in the query exist in the provided schema)' : ''}

IMPORTANT:
- Do NOT critique or suggest improvements to the schema itself
- Only validate the SQL query against the schema (if provided)
- Assume the schema is correct and properly designed
- Focus only on whether the query will work with the given schema

Your response MUST be a valid JSON object with the following structure and nothing else:
{
  "isValid": true/false,
  "query": "Original query or fixed query if there are issues",
  "issues": [
    {
      "type": "syntax|performance|security|style|schema|other",
      "description": "Description of the issue",
      "location": "Line/column information if applicable",
      "severity": "info|warning|error",
      "suggestion": "Suggested fix"
    }
  ],
  "explanation": "Overall explanation of the query validity"
}

DO NOT wrap your response in markdown code blocks or any other formatting. Return ONLY the JSON object.
`;

      console.log("=== SQL VALIDATION PROMPT ===");
      console.log(prompt);
      console.log("============================");

      const response = await this.aiService.generateContent(prompt);
      
      console.log("=== SQL VALIDATION RAW RESPONSE ===");
      console.log(response);
      console.log("==================================");
      
      try {
        // First attempt: Direct JSON parsing
        const parsedResponse = JSON.parse(response);
        return {
          isValid: parsedResponse.isValid,
          query: parsedResponse.query || query,
          issues: parsedResponse.issues || [],
          explanation: parsedResponse.explanation || ''
        };
      } catch (parseError) {
        // Second attempt: Remove markdown code blocks
        try {
          // Remove markdown code block syntax
          const cleanedResponse = response.replace(/```(json|javascript|js)?\s+/g, '').replace(/\s*```\s*$/g, '');
          
          // Try parsing the cleaned response
          const parsedResponse = JSON.parse(cleanedResponse);
          
          return {
            isValid: parsedResponse.isValid,
            query: parsedResponse.query || query,
            issues: parsedResponse.issues || [],
            explanation: parsedResponse.explanation || 'No explanation provided',
            debug: {
              rawResponse: response,
              cleanedContent: cleanedResponse
            }
          };
        } catch (cleaningError) {
          // Third attempt: Try to extract JSON using regex
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonString = jsonMatch[0];
              const extractedJson = JSON.parse(jsonString);
              
              if (extractedJson.isValid !== undefined) {
                return {
                  isValid: extractedJson.isValid,
                  query: extractedJson.query || query,
                  issues: extractedJson.issues || [],
                  explanation: extractedJson.explanation || 'No explanation provided',
                  debug: {
                    rawResponse: response,
                    cleanedContent: jsonString
                  }
                };
              }
            }
            
            // Third attempt: Extract validation information directly
            const isValidMatch = response.match(/valid|invalid|correct|incorrect|error|issue|problem/i);
            const isValid = isValidMatch ? 
              !response.match(/invalid|incorrect|error|issue|problem/i) : 
              false;
            
            // Try to extract issues
            const issues: SQLIssue[] = [];
            const issueMatches = response.match(/(?:syntax|performance|security|style|schema)[\s\S]*?(?:error|warning|issue|problem)/gi);
            
            if (issueMatches) {
              issueMatches.forEach((match, index) => {
                let type: 'syntax' | 'performance' | 'security' | 'style' | 'schema' | 'other' = 'other';
                if (match.match(/syntax/i)) type = 'syntax';
                else if (match.match(/performance/i)) type = 'performance';
                else if (match.match(/security/i)) type = 'security';
                else if (match.match(/style/i)) type = 'style';
                else if (match.match(/schema/i)) type = 'schema';
                
                let severity: 'info' | 'warning' | 'error' = 'warning';
                if (match.match(/error/i)) severity = 'error';
                else if (match.match(/warning/i)) severity = 'warning';
                else if (match.match(/info/i)) severity = 'info';
                
                issues.push({
                  type,
                  description: match,
                  severity,
                  suggestion: ''
                });
              });
            }
            
            return {
              isValid,
              query,
              issues,
              explanation: "Extracted from unstructured response",
              error: "Response format issue - validation may be incomplete",
              debug: {
                rawResponse: response,
                parseError: parseError instanceof Error ? parseError.message : String(parseError)
              }
            };
          } catch (extractionError) {
            return {
              isValid: false,
              query,
              error: "Invalid response format",
              debug: {
                rawResponse: response,
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                extractionError: extractionError instanceof Error ? extractionError.message : String(extractionError)
              }
            };
          }
        }
      }
    } catch (error) {
      console.error("Error validating SQL query:", error);
      return {
        isValid: false,
        query,
        error: `Failed to validate SQL query: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async convertSQLQuery(request: SQLConversionRequest): Promise<SQLConversionResponse> {
    const { query, sourceDialect, targetDialect } = request;
    console.log('[SQLAIService] Converting SQL Query', { sourceDialect, targetDialect, queryLength: query.length });
    
    try {
      const prompt = `
You are an expert SQL developer. Convert the following SQL query from ${sourceDialect} dialect to ${targetDialect} dialect.

Original SQL Query (${sourceDialect}):
\`\`\`sql
${query}
\`\`\`

Please provide:
1. The converted SQL query in ${targetDialect} dialect
2. An explanation of the key differences between the dialects that required changes
3. Any notes on functionality that might not be directly translatable

IMPORTANT: Your response MUST be a valid JSON object with the following structure and nothing else:
{
  "originalQuery": "The original SQL query",
  "convertedQuery": "The converted SQL query in the target dialect",
  "explanation": "Explanation of the conversion process",
  "dialectDifferences": [
    "List of key differences between the dialects that required changes"
  ]
}

DO NOT wrap your response in markdown code blocks or any other formatting. Return ONLY the JSON object.
`;

      console.log("=== SQL CONVERSION PROMPT ===");
      console.log(prompt);
      console.log("============================");

      const response = await this.aiService.generateContent(prompt);
      
      console.log("=== SQL CONVERSION RAW RESPONSE ===");
      console.log(response);
      console.log("==================================");
      
      try {
        // First attempt: Direct JSON parsing
        const parsedResponse = JSON.parse(response);
        return {
          query: parsedResponse.convertedQuery,
          originalQuery: parsedResponse.originalQuery || query,
          convertedQuery: parsedResponse.convertedQuery,
          dialectDifferences: parsedResponse.dialectDifferences,
          explanation: parsedResponse.explanation
        };
      } catch (parseError) {
        // Second attempt: Remove markdown code blocks
        try {
          // Remove markdown code block syntax
          const cleanedResponse = response.replace(/```(json|javascript|js)?\s+/g, '').replace(/\s*```\s*$/g, '');
          
          // Try parsing the cleaned response
          const parsedResponse = JSON.parse(cleanedResponse);
          
          return {
            query: parsedResponse.convertedQuery,
            originalQuery: parsedResponse.originalQuery || query,
            convertedQuery: parsedResponse.convertedQuery,
            dialectDifferences: parsedResponse.dialectDifferences,
            explanation: parsedResponse.explanation,
            debug: {
              rawResponse: response,
              cleanedContent: cleanedResponse
            }
          };
        } catch (cleaningError) {
          // Third attempt: Try to extract JSON using regex
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonString = jsonMatch[0];
              const extractedJson = JSON.parse(jsonString);
              
              return {
                query: extractedJson.convertedQuery,
                originalQuery: extractedJson.originalQuery || query,
                convertedQuery: extractedJson.convertedQuery,
                dialectDifferences: extractedJson.dialectDifferences,
                explanation: extractedJson.explanation,
                debug: {
                  rawResponse: response,
                  cleanedContent: jsonString
                }
              };
            }
            
            throw new Error("Could not extract valid JSON from response");
          } catch (extractionError) {
            return {
              query: "",
              originalQuery: query,
              convertedQuery: "",
              error: "Invalid response format",
              debug: {
                rawResponse: response,
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                cleaningError: cleaningError instanceof Error ? cleaningError.message : String(cleaningError),
                extractionError: extractionError instanceof Error ? extractionError.message : String(extractionError)
              }
            };
          }
        }
      }
    } catch (error) {
      console.error("Error converting SQL query:", error);
      return {
        query: "",
        originalQuery: query,
        convertedQuery: "",
        error: `Failed to convert SQL query: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
} 
