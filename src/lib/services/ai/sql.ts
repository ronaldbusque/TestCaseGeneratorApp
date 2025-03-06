import { GeminiService } from './gemini';
import { 
  SQLDialect, 
  SQLGenerationRequest, 
  SQLValidationRequest, 
  SQLConversionRequest,
  SQLResponse,
  SQLValidationResponse,
  SQLConversionResponse
} from '@/lib/types';

export class SQLAIService extends GeminiService {
  async generateSQLQuery(request: SQLGenerationRequest): Promise<SQLResponse> {
    const { description, targetDialect, schema } = request;
    
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
You are an expert SQL developer. Generate a SQL query based on the following description.
The query should be written in ${targetDialect} dialect.

Description: ${description}

${processedSchema ? `Database Schema:
\`\`\`sql
${processedSchema}
\`\`\`

${schemaFormat === 'json' ? 'This schema was derived from database metadata in JSON format and converted to table definitions for your reference.' : ''}` : ''}

${processedSchema ? 'Using the provided database schema, ' : ''}Please provide:
1. The optimized SQL query
2. A brief explanation of how the query works

IMPORTANT: Your response MUST be a valid JSON object with the following structure and nothing else:
{
  "query": "SQL query here",
  "explanation": "Explanation here"
}
`;

      const response = await this.generateContent(prompt, 'gemini-2.0-flash-thinking-exp-01-21');
      
      try {
        // First attempt: Direct JSON parsing
        const parsedResponse = JSON.parse(response);
        return {
          query: parsedResponse.query,
          explanation: parsedResponse.explanation
        };
      } catch (parseError) {
        // Second attempt: Try to extract JSON using regex
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonString = jsonMatch[0];
            const extractedJson = JSON.parse(jsonString);
            
            if (extractedJson.query) {
              return {
                query: extractedJson.query,
                explanation: extractedJson.explanation || "No explanation provided",
                debug: {
                  rawResponse: response,
                  cleanedContent: jsonString
                }
              };
            }
          }
          
          // Third attempt: Extract SQL directly if JSON parsing fails
          const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/);
          if (sqlMatch && sqlMatch[1]) {
            return {
              query: sqlMatch[1].trim(),
              explanation: "Extracted from response",
              debug: {
                rawResponse: response,
                parseError: parseError instanceof Error ? parseError.message : String(parseError)
              }
            };
          }
          
          // If no SQL found but we have text, return best guess
          if (response.length > 0) {
            const lines = response.split('\n').filter(line => line.trim() && !line.trim().startsWith('{') && !line.trim().startsWith('}'));
            const possibleQuery = lines.find(line => 
              line.toUpperCase().includes('SELECT') || 
              line.toUpperCase().includes('INSERT') || 
              line.toUpperCase().includes('UPDATE') || 
              line.toUpperCase().includes('DELETE')
            );
            
            if (possibleQuery) {
              return {
                query: possibleQuery,
                explanation: "Best effort extraction from malformed response",
                error: "Response format issue - query may be incomplete",
                debug: {
                  rawResponse: response,
                  parseError: parseError instanceof Error ? parseError.message : String(parseError)
                }
              };
            }
          }
          
          // All attempts failed
          throw new Error("Could not extract SQL query from response");
        } catch (extractionError) {
          return {
            query: "Failed to parse response",
            error: "Invalid response format",
            debug: {
              rawResponse: response,
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
              extractionError: extractionError instanceof Error ? extractionError.message : String(extractionError)
            }
          };
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
    const { query, dialect } = request;
    
    try {
      const prompt = `
You are an expert SQL developer. Analyze the following SQL query for the ${dialect} dialect and validate it.

SQL Query:
\`\`\`sql
${query}
\`\`\`

Please identify any issues with:
1. Syntax errors
2. Performance concerns
3. Security issues (SQL injection vulnerabilities, etc.)
4. Style/best practices

Format your response as a JSON object with the following structure:
{
  "isValid": true/false,
  "query": "Original query or fixed query if there are issues",
  "issues": [
    {
      "type": "syntax|performance|security|style|other",
      "description": "Description of the issue",
      "location": "Line/column information if applicable",
      "severity": "info|warning|error",
      "suggestion": "Suggested fix"
    }
  ],
  "explanation": "Overall explanation of the query validity"
}
`;

      const response = await this.generateContent(prompt, 'gemini-2.0-flash-thinking-exp-01-21');
      try {
        const parsedResponse = JSON.parse(response);
        return {
          isValid: parsedResponse.isValid,
          query: parsedResponse.query,
          issues: parsedResponse.issues,
          explanation: parsedResponse.explanation
        };
      } catch (error) {
        return {
          isValid: false,
          query,
          error: "Invalid response format",
          debug: {
            rawResponse: response,
            parseError: error instanceof Error ? error.message : String(error)
          }
        };
      }
    } catch (error) {
      return {
        isValid: false,
        query,
        error: "Failed to validate SQL query",
        debug: {
          parseError: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  async convertSQLQuery(request: SQLConversionRequest): Promise<SQLConversionResponse> {
    const { query, sourceDialect, targetDialect } = request;
    
    try {
      const prompt = `
You are an expert SQL developer with deep knowledge of different SQL dialects. Convert the following SQL query from ${sourceDialect} dialect to ${targetDialect} dialect.

Original Query (${sourceDialect}):
\`\`\`sql
${query}
\`\`\`

Please provide:
1. The converted query in ${targetDialect} syntax
2. An explanation of the key differences between the dialects relevant to this query
3. Any functionality that may not be directly translatable

Format your response as a JSON object with the following structure:
{
  "originalQuery": "Original query here",
  "convertedQuery": "Converted query here",
  "dialectDifferences": ["Difference 1", "Difference 2", ...],
  "explanation": "Overall explanation of the conversion"
}
`;

      const response = await this.generateContent(prompt, 'gemini-2.0-flash-thinking-exp-01-21');
      try {
        const parsedResponse = JSON.parse(response);
        return {
          query: parsedResponse.convertedQuery,
          originalQuery: parsedResponse.originalQuery || query,
          convertedQuery: parsedResponse.convertedQuery,
          dialectDifferences: parsedResponse.dialectDifferences,
          explanation: parsedResponse.explanation
        };
      } catch (error) {
        return {
          query: "",
          originalQuery: query,
          convertedQuery: "",
          error: "Invalid response format",
          debug: {
            rawResponse: response,
            parseError: error instanceof Error ? error.message : String(error)
          }
        };
      }
    } catch (error) {
      return {
        query: "",
        originalQuery: query,
        convertedQuery: "",
        error: "Failed to convert SQL query",
        debug: {
          parseError: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
} 