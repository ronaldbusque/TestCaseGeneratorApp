/**
 * Cleans and validates JSON string content, handling various edge cases and malformed input.
 */
export class JsonCleaner {
  /**
   * Cleans a JSON string by handling various edge cases and malformed input.
   * @param content The JSON string to clean
   * @returns The cleaned JSON string
   */
  static cleanJsonResponse(content: string): string {
    // Remove markdown code block if present
    let cleanContent = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim();
    }

    // Remove any BOM or invalid control characters
    cleanContent = cleanContent
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\r?\n/g, ' ') // Normalize line endings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Replace dynamic string generation expressions with literal strings
    cleanContent = cleanContent
      // Handle any dynamic expressions combining literal strings with .repeat calls
      .replace(/\"([^\"]+)\"\s*\+\s*(?:\")?([A-Za-z0-9]+)(?:\")?\.repeat\((\d+)\)/g, (match, prefix, char, count) => {
        const repeatedStr = char.repeat(parseInt(count, 10));
        return `"${prefix}${repeatedStr}"`;
      })
      // Handle string concatenations with @ symbol or other special characters
      .replace(/\"([^\"]+)\"\s*\+\s*\"([^\"]+)\"/g, (match, part1, part2) => {
        return `"${part1}${part2}"`;
      })
      // Handle other dynamic string concatenations in arrays or direct properties
      .replace(/\"([^\"]+)\"\s*\+\s*([^,\]}\"]+)/g, (match, prefix, expr) => {
        try {
          // Skip if it's already been handled by previous replacements
          if (match.includes('.repeat(') || (prefix && !expr)) {
            return match;
          }
          const evalResult = eval(expr.trim());
          return `"${prefix}${evalResult}"`;
        } catch {
          const defaultValue = "Dynamic content generation failed";
          return `"${prefix}${defaultValue}"`;
        }
      });

    // Ensure the content starts with [ and ends with ]
    const arrayMatch = cleanContent.match(/^\s*\[[\s\S]*\]\s*$/);
    if (!arrayMatch) {
      throw new Error('Response does not contain a valid JSON array');
    }

    // Clean individual JSON strings
    cleanContent = JsonCleaner.cleanJsonString(cleanContent);

    // Validate JSON structure
    try {
      JSON.parse(cleanContent);
    } catch (error: any) {
      throw new Error(`Invalid JSON structure: ${error.message}`);
    }

    return cleanContent;
  }

  /**
   * Cleans individual JSON string literals within a JSON string.
   * @param jsonContent The JSON string containing string literals to clean
   * @returns The cleaned JSON string
   */
  static cleanJsonString(jsonContent: string): string {
    // This regex matches JSON string literals
    const stringLiteralPattern = /"((?:\\.|[^"\\])*?)"/g;
    
    return jsonContent.replace(stringLiteralPattern, (match, capturedString) => {
      try {
        // First try to parse any existing escape sequences
        const decoded = JSON.parse('"' + capturedString + '"');
        // Re-encode to ensure proper escaping
        return JSON.stringify(decoded);
      } catch {
        // If parsing fails, try to clean the string manually
        const cleaned = capturedString
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/"/g, '\\"')    // Then escape quotes
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control chars
        return `"${cleaned}"`;
      }
    });
  }
} 