import { AIService } from '@/lib/types';
import { 
  TestDataGenerationRequest, 
  TestDataGenerationResponse, 
  TestDataType,
  GeneratedTestData
} from '@/lib/types/testData';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';
import { faker } from '@faker-js/faker';

// Define the FieldDefinition interface
interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  options: Record<string, any>;
}

export class TestDataGeneratorService {
  private aiService: AIService; // Add private member for the core AI service
  private faker = faker;
  private fakerTypeDefinitions = fakerTypeDefinitions;
  
  // Inject AIService via constructor
  constructor(aiService: AIService) {
    this.aiService = aiService;
    console.log('[TestDataGeneratorService] initialized with underlying AI Service:', { serviceType: aiService.constructor.name });
  }
  
  async generateTestData(request: TestDataGenerationRequest): Promise<TestDataGenerationResponse> {
    try {
      const { types, configuration, count = 100, aiEnhancement } = request;
      
      // Generate raw data using faker
      const rawData = this.generateRawFakerData(types, configuration, count);
      
      // If AI enhancement is requested, process the data
      if (aiEnhancement && aiEnhancement.trim()) {
        return this.enhanceDataWithAI(rawData, aiEnhancement);
      }
      
      // Return raw data if no AI enhancement
      return {
        data: rawData,
        count: rawData.length
      };
    } catch (error) {
      console.error('Error in test data generation:', error);
      return {
        data: [],
        count: 0,
        error: `Failed to generate test data: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  private generateRawFakerData(
    types: TestDataType[], 
    configuration: Record<string, any>, 
    count: number
  ): GeneratedTestData[] {
    const result: GeneratedTestData[] = [];
    
    for (let i = 0; i < count; i++) {
      const dataRow: Record<string, any> = {};
      
      types.forEach(type => {
        // Get type configuration if available
        const typeConfig = configuration[type.name] || {};
        
        // Generate data based on type
        dataRow[type.name] = this.generateDataByType(type.name, typeConfig);
      });
      
      result.push(dataRow);
    }
    
    return result;
  }
  
  private generateDataByType(typeName: string, config: Record<string, any>): any {
    try {
      // Dynamic import of faker to avoid build errors
      const { faker } = require('@faker-js/faker');
      
      // Direct mappings for common types that might cause issues
      const directMappings: Record<string, () => any> = {
        'Car Make': () => faker.vehicle.manufacturer(),
        'Car Model': () => faker.vehicle.model(),
        'Car Model Year': () => {
          // Custom implementation for model year
          const currentYear = new Date().getFullYear();
          return Math.floor(Math.random() * (currentYear - 1950 + 1)) + 1950;
        },
        'Car VIN': () => faker.vehicle.vin(),
        'Boolean': () => faker.datatype.boolean(),
        'Buzzword': () => faker.company.buzzPhrase(),
        'City': () => faker.location.city(),
        'Address Line 2': () => faker.location.secondaryAddress(),
        'Bitcoin Address': () => faker.finance.bitcoinAddress()
      };
      
      // If we have a direct mapping, use it
      if (directMappings[typeName]) {
        return directMappings[typeName]();
      }
      
      // Get the type definition or use a default if not found
      const typeDefinition = fakerTypeDefinitions[typeName] || { fakerMethod: null, options: [] };
      
      // If no faker method is defined, return null
      if (!typeDefinition.fakerMethod) {
        return null;
      }
      
      // Handle custom methods that require special logic
      if (typeDefinition.fakerMethod === "custom") {
        return this.handleCustomType(typeName, config);
      }
      
      // Handle regular faker methods
      try {
        // Parse the method path (e.g., "location.city" -> ["location", "city"])
        const methodPath = typeDefinition.fakerMethod.split('.');
        
        // Handle methods with parameters
        if (methodPath.join('.').includes('()')) {
          // For methods like "airline.airport().iataCode"
          const complexPath = typeDefinition.fakerMethod.match(/([^.]+)\.([^.]+)\(\)\.([^.]+)/);
          if (complexPath) {
            const [_, namespace, method, property] = complexPath;
            // Check if method exists
            if (faker[namespace] && typeof faker[namespace][method] === 'function') {
              const result = faker[namespace][method]();
              return result[property];
            }
            return `Error: Method ${namespace}.${method} not found`;
          }
          return null;
        }
        
        // Handle normal methods with configuration
        let currentObj = faker;
        
        for (let i = 0; i < methodPath.length - 1; i++) {
          if (!currentObj[methodPath[i]]) {
            console.error(`Namespace ${methodPath[i]} not found in faker`);
            return `Error: ${typeName} (invalid path)`;
          }
          currentObj = currentObj[methodPath[i]];
        }
        
        const method = methodPath[methodPath.length - 1];
        
        // Check if method exists
        if (typeof currentObj[method] !== 'function') {
          console.error(`Method ${method} not found in faker namespace ${methodPath.slice(0, -1).join('.')}`);
          return `Error: ${typeName} (method not found)`;
        }
        
        // If we have configuration options, pass them to the faker method
        if (Object.keys(config).length > 0) {
          return currentObj[method](config);
        } else {
          return currentObj[method]();
        }
      } catch (error) {
        console.error(`Error generating data for type ${typeName}:`, error);
        return `Error: ${typeName}`;
      }
    } catch (error) {
      console.error(`Error loading faker for type ${typeName}:`, error);
      return `Error: ${typeName} (faker not loaded)`;
    }
  }
  
  private handleCustomType(typeName: string, config: Record<string, any>): any {
    try {
      // Dynamic import of faker to avoid build errors
      const { faker } = require('@faker-js/faker');
      
      // Handle custom types that require special logic
      switch (typeName.toLowerCase()) {
        // Vehicle related
        case "Car Model Year":
          // Custom implementation for model year
          const currentYear = new Date().getFullYear();
          // Use min/max from config if provided
          const minYear = config.min ? Number(config.min) : 1950;
          const maxYear = config.max ? Number(config.max) : currentYear;
          return Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
          
        // Health related
        // case "Blood Type":
        //   // Return a random blood type
        //   const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        //   return bloodTypes[Math.floor(Math.random() * bloodTypes.length)];
          
        // Airport related
        case "Airport Name":
          return `${faker.location.city()} ${['International', 'Regional', 'Municipal', 'County'][Math.floor(Math.random() * 4)]} Airport`;
        
        case "Airport Region Code":
          return `${faker.location.countryCode()}-${faker.location.state({ abbreviated: true })}`;
          
        case "Airport Code":
          return faker.airline.iataCode();
          
        case "Airport Continent":
          return ['NA', 'EU', 'AS', 'AF', 'AU', 'SA'][Math.floor(Math.random() * 6)];
          
        case "Airport Country Code":
          return faker.location.countryCode();
          
        case "Airport Elevation (Feet)":
          return Math.floor(Math.random() * 9000);
          
        case "Airport GPS Code":
          return faker.airline.icao();
          
        case "Airport Latitude":
          return faker.location.latitude();
          
        case "Airport Longitude":
          return faker.location.longitude();
          
        case "Airport Municipality":
          return faker.location.city();
          
        // Animal related
        case "Animal Common Name":
          return faker.animal.type();
          
        case "Animal Scientific Name":
          return `${faker.science.chemicalElement().name} ${faker.animal.type()}`;
          
        // IT related
        case "App Bundle ID":
          return `com.${faker.company.name().toLowerCase().replace(/\W/g, '')}.${faker.commerce.product().toLowerCase()}`;
          
        case "App Name":
          return faker.company.name();
          
        case "App Version":
          return faker.system.semver();
          
        case "Avatar":
          return faker.image.avatar();
          
        case "Base64 Image URL":
          return 'data:image/png;base64,' + faker.string.alphanumeric(50);
          
        // Other types
        case "Binomial Distribution":
          return faker.number.int(config.max || 100);
          
        case "Catch Phrase":
          return faker.company.catchPhrase();
          
        case "Character Sequence":
          return this.generateCharacterSequence(config);
          
        case "City":
          return faker.location.city();
          
        // Add more custom type handlers as needed
        
        default:
          // Try a direct mapping based on name similarity to faker methods
          try {
            // For names like "First Name" -> try faker.person.firstName()
            const nameParts = typeName.split(' ');
            if (nameParts.length >= 2) {
              // Convert "First Name" to "firstName", "Last Name" to "lastName", etc.
              const methodName = nameParts[0].toLowerCase() + 
                nameParts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
              
              // Try different common faker namespaces
              const namespaces = ['person', 'location', 'commerce', 'company', 'vehicle', 'finance'];
              
              for (const namespace of namespaces) {
                if (faker[namespace] && typeof faker[namespace][methodName] === 'function') {
                  return faker[namespace][methodName]();
                }
              }
            }
          } catch (e) {
            // Ignore errors in this fallback approach
          }
          
          return `${typeName} (custom)`;
      }
    } catch (error) {
      console.error(`Error generating custom type ${typeName}:`, error);
      return `${typeName} (error)`;
    }
  }
  
  private generateCharacterSequence(options: Record<string, any>): string {
    const prefix = options.prefix || '';
    const length = options.length || 5;
    const startAt = options.startAt || 1;
    const padZeros = options.padZeros || false;
    
    // Calculate the current value
    const currentValue = startAt;
    
    // Pad with zeros if requested
    let sequenceNumber = currentValue.toString();
    if (padZeros) {
      sequenceNumber = sequenceNumber.padStart(length, '0');
    }
    
    return `${prefix}${sequenceNumber}`;
  }
  
  async generateTestDataFromFields(request: { 
    fields: Array<{name: string, type: string, options: Record<string, any>}>, 
    count: number,
    aiEnhancement?: string
  }): Promise<TestDataGenerationResponse> {
    try {
      const { fields, count = 100, aiEnhancement } = request;
      
      // Convert fields to FieldDefinition format
      const fieldDefinitions: FieldDefinition[] = fields.map(field => ({
        id: Math.random().toString(36).substring(2, 9), // Generate a random ID
        name: field.name,
        type: field.type,
        options: field.options
      }));
      
      // Use the new generateData method with aiEnhancement
      const result = await this.generateData(fieldDefinitions, count, aiEnhancement);
      
      return {
        data: result,
        count: result.length
      };
    } catch (error) {
      console.error('Error generating test data from fields:', error);
      return {
        data: [],
        count: 0,
        error: `Failed to generate test data: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  private generateValueForField(type: string, options: Record<string, any> = {}): any {
    try {
      // Handle special cases first
      if (type === 'Character Sequence') {
        return this.generateCharacterSequence(options);
      }
      
      if (type === 'AI-Generated') {
        // Return a placeholder for AI-generated fields
        return '[AI: Generating...]';
      }
      
      // Special case handlers for specific types
      switch (type) {
        case 'Number':
          // Handle Number type - simple random integer between min and max
          const min = options.min !== undefined ? Number(options.min) : 1;
          const max = options.max !== undefined ? Number(options.max) : 1000;
          return Math.floor(Math.random() * (max - min + 1)) + min;
          
        case 'Decimal Number':
          // Handle Decimal Number type with multipleOf parameter
          return this.faker.number.float({
            min: options.min !== undefined ? Number(options.min) : 0,
            max: options.max !== undefined ? Number(options.max) : 100,
            multipleOf: options.multipleOf !== undefined ? Number(options.multipleOf) : 0.01
          } as any); // Type assertion to avoid TypeScript errors
          
        case 'Airport Code':
          // Generate a random 3-letter airport code
          return this.faker.string.alpha({ length: 3, casing: 'upper' });
          
        case 'Animal Scientific Name':
          // Generate a scientific-sounding animal name
          const genus = this.faker.science.chemicalElement().name;
          const species = this.faker.animal.type().toLowerCase();
          return `${genus} ${species}`;
          
        case 'App Bundle ID':
          // Generate an app bundle ID
          const company = options.company || this.faker.company.name().toLowerCase().replace(/\W/g, '');
          const product = this.faker.commerce.product().toLowerCase().replace(/\W/g, '');
          const format = options.format || 'com.{company}.{product}';
          return format
            .replace('{company}', company)
            .replace('{product}', product);
      }
      
      // Get the faker method from the type definitions
      const typeDefinition = this.fakerTypeDefinitions[type];
      if (!typeDefinition) {
        console.warn(`No faker type definition found for: ${type}`);
        return `[Unknown type: ${type}]`;
      }
      
      const fakerMethod = typeDefinition.fakerMethod;
      if (!fakerMethod) {
        console.warn(`No faker method defined for type: ${type}`);
        return `[No method for: ${type}]`;
      }
      
      // Handle other faker methods using a safer approach
      try {
        // Use a dynamic approach with error handling
        const parts = fakerMethod.split('.');
        let result: any;
        
        if (parts.length === 2) {
          const [namespace, method] = parts;
          // @ts-ignore - We're handling errors if the property doesn't exist
          result = this.faker[namespace]?.[method]?.(options);
        } else if (parts.length === 3) {
          const [namespace, subnamespace, method] = parts;
          // @ts-ignore - We're handling errors if the property doesn't exist
          result = this.faker[namespace]?.[subnamespace]?.[method]?.(options);
        }
        
        if (result !== undefined) {
          return result;
        }
        
        console.warn(`Could not execute faker method: ${fakerMethod}`);
        return `[Method not found: ${fakerMethod}]`;
      } catch (error) {
        console.warn(`Error executing faker method ${fakerMethod}:`, error);
        return `[Error: ${fakerMethod}]`;
      }
    } catch (error) {
      console.error('Error generating value for field:', error);
      return `[Error: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }
  
  async enhanceDataWithAI(
    rawData: Record<string, any>[], 
    aiEnhancement: string
  ): Promise<TestDataGenerationResponse> {
    try {
      // Only process a sample of data if there's a lot to avoid token limitations
      const sampleSize = rawData.length > 10 ? 10 : rawData.length;
      const sampleData = rawData.slice(0, sampleSize);
      
      // Check if the enhancement request includes uniqueness requirements
      const uniquenessRequested = aiEnhancement.toLowerCase().includes('unique') || 
                               aiEnhancement.toLowerCase().includes('distinct') ||
                               aiEnhancement.toLowerCase().includes('no duplicate') ||
                               aiEnhancement.toLowerCase().includes('variety');
      
      // Get column information to help AI understand the schema
      const columns = Object.keys(rawData[0] || {});
      const totalRows = rawData.length;
      
      // Create a prompt for the AI
      const prompt = `
You are a test data engineering expert. I have generated ${totalRows} rows of test data and want to enhance it based on the following instructions:

${aiEnhancement}

Here's a sample of the data I've generated (showing ${sampleData.length} of ${totalRows} total rows):
\`\`\`json
${JSON.stringify(sampleData, null, 2)}
\`\`\`

The data has the following columns: ${columns.join(', ')}

${uniquenessRequested ? `
IMPORTANT: The user has requested UNIQUE/DISTINCT values. Your enhancement MUST ensure:
- Each row should be distinct and different from others
- Avoid repetitive patterns or duplicate values where possible
- For columns that should be unique (IDs, emails, names, etc.), generate truly unique values
- Add sufficient randomization and variety to make each entry realistic and distinct
- Consider using row index information to ensure uniqueness
` : `
Please ensure your enhancements maintain good variety and avoid excessive repetition.
`}

Please provide two things:
1. A detailed explanation of how the data should be enhanced or transformed to meet the requirements.
2. A JavaScript function that I can use to process each row of my data to implement these enhancements.

Your JavaScript function should:
- Accept two parameters: the data row and the row index (e.g., function enhanceData(row, index) {...})
- Return the enhanced/modified row
- Include comments explaining the logic
- Handle edge cases gracefully
- Ensure high variability and uniqueness in the data ${uniquenessRequested ? 'as specifically requested' : 'where appropriate'}
- Use the row index if needed to generate unique values
- Be optimized for performance

Format your response as a valid JSON object like this:
{
  "explanation": "Your detailed explanation here",
  "function": "function enhanceData(row, index) { /* Your code here */ return enhancedRow; }"
}
`;

      console.log("\n=== AI ENHANCEMENT PROMPT ===");
      console.log(prompt);
      console.log("==============================\n");
      
      // Call the AI service with the prompt
      const response = await this.aiService.generateContent(prompt, 'gemini-2.0-flash-thinking-exp-01-21');
      
      console.log("\n=== AI ENHANCEMENT RAW RESPONSE ===");
      console.log(response);
      console.log("===================================\n");
      
      try {
        // Clean response and extract JSON
        let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.log("\n=== JSON EXTRACTION FAILED ===");
          console.log("Could not extract valid JSON from AI response");
          console.log("Cleaned response:", cleanedResponse);
          console.log("============================\n");
          throw new Error("Could not extract valid JSON from AI response");
        }
        
        // Original JSON string from the model
        const jsonStr = jsonMatch[0];
        
        // Log the extracted JSON
        console.log("\n=== EXTRACTED JSON ===");
        console.log(jsonStr);
        console.log("=====================\n");
        
        // Create a direct function that enhances each row based on the AI response 
        // This bypasses the need to parse and execute the AI-generated code
        const enhancementFunction = (row: Record<string, any>, index: number): Record<string, any> => {
          try {
            // Check if we have a valid function response from the AI
            const functionMatch = jsonStr.match(/"function"\s*:\s*"([\s\S]+?)"/);
            
            if (functionMatch && functionMatch[1]) {
              console.log("\n=== FOUND ENHANCEMENT FUNCTION ===");
              // Safely unescape the function code
              let functionCode = functionMatch[1]
                .replace(/\\"/g, '"')     // Restore double quotes
                .replace(/\\n/g, '\n')    // Restore newlines
                .replace(/\\r/g, '\r')    // Restore carriage returns
                .replace(/\\\\/g, '\\')   // Restore backslashes
                .replace(/\\t/g, '\t');   // Restore tabs
              
              // Create a safe function wrapper
              // We use indirect eval and wrap everything in a closure for safety
              try {
                // Inject the row and index into a self-executing function
                // This creates a completely isolated scope to prevent any issues
                const resultString = new Function('rowData', 'rowIndex', `
                  try {
                    // Create a safety wrapper
                    const safeRun = () => {
                      ${functionCode}
                      
                      // Check if the function was defined and is callable
                      if (typeof enhanceData === 'function') {
                        return JSON.stringify(enhanceData(rowData, rowIndex));
                      } else {
                        throw new Error("enhanceData function not properly defined");
                      }
                    };
                    
                    // Run the function in the protected scope
                    return safeRun();
                  } catch (err) {
                    console.error("Error in AI enhancement function:", err);
                    return JSON.stringify(rowData);
                  }
                `)(row, index);
                
                // Parse the result string back to an object
                const enhancedRow = JSON.parse(resultString);
                return enhancedRow;
              } catch (funcExecError) {
                console.error("Error executing AI function:", funcExecError);
                // Fallback to simple property enhancement
                return applyGenericEnhancement(row, index);
              }
            } else {
              // No function found in response, apply generic enhancement
              console.log("\n=== NO FUNCTION FOUND IN AI RESPONSE ===");
              console.log("Applying generic enhancement instead");
              console.log("=====================================\n");
              return applyGenericEnhancement(row, index);
            }
          } catch (error) {
            console.error(`Error enhancing row ${index}:`, error);
            // Return original row if enhancement fails
            return row;
          }
        };
        
        // Helper function for generic enhancement
        const applyGenericEnhancement = (row: Record<string, any>, index: number): Record<string, any> => {
          // Create a copy to avoid modifying the original
          const enhancedRow = { ...row };
          
          // Apply simple enhancements based on field types
          Object.keys(enhancedRow).forEach(key => {
            const value = enhancedRow[key];
            
            if (typeof value === 'string') {
              // String enhancement
              if (key.toLowerCase().includes('email')) {
                enhancedRow[key] = `enhanced.${value}`;
              } else if (key.toLowerCase().includes('name')) {
                enhancedRow[key] = `Enhanced ${value}`;
              } else {
                enhancedRow[key] = value;
              }
            } else if (typeof value === 'number') {
              // Number enhancement - add a small increment based on index
              enhancedRow[key] = value + (index % 10);
            } else if (value instanceof Date) {
              // Date enhancement - add some days based on index
              const newDate = new Date(value);
              newDate.setDate(newDate.getDate() + (index % 30));
              enhancedRow[key] = newDate;
            }
            // Leave other types unchanged
          });
          
          return enhancedRow;
        };
        
        // Apply the enhancement function to each data row
        console.log("\n=== APPLYING ENHANCEMENT TO DATA ===");
        console.log(`Enhancing ${rawData.length} rows of data`);
        console.log("================================\n");
        
        const enhancedData = rawData.map((row, index) => {
          try {
            return enhancementFunction(row, index);
          } catch (error) {
            console.error(`Error enhancing row ${index}:`, error);
            return row;
          }
        });
        
        console.log("\n=== ENHANCEMENT COMPLETE ===");
        console.log(`Successfully enhanced ${enhancedData.length} rows of data`);
        console.log("===========================\n");
        
        // Extract explanation from the response for debugging and user information
        const explanationRegex = /"explanation"\s*:\s*"(([\s\S])*?)"/;
        const explanationMatch = explanationRegex.exec(jsonStr);
        let explanation = '';
        if (explanationMatch) {
          explanation = explanationMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')
            .replace(/\\t/g, '\t');
        }
        
        return {
          data: enhancedData,
          count: enhancedData.length,
          aiExplanation: explanation
        };
      } catch (processingError) {
        // Handle JSON extraction or processing errors
        console.log("\n=== ERROR PROCESSING AI RESPONSE ===");
        console.error(processingError);
        console.log("Full response:", response);
        console.log("=============================\n");
        
        return {
          data: rawData,
          count: rawData.length,
          error: 'Failed to process AI enhancement response',
          debug: {
            rawResponse: response,
            parseError: String(processingError),
            stack: processingError instanceof Error ? processingError.stack : undefined
          }
        };
      }
    } catch (error) {
      // Handle any other errors that might occur during the entire process
      console.log("\n=== UNEXPECTED ERROR IN AI ENHANCEMENT ===");
      console.error(error);
      console.log("========================================\n");
      
      return {
        data: rawData,
        count: rawData.length,
        error: 'An unexpected error occurred during AI enhancement',
        debug: {
          rawResponse: String(error),
          parseError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }

  async generateData(fields: FieldDefinition[], count: number, aiEnhancement?: string): Promise<any[]> {
    try {
      // Separate regular fields from AI-generated fields
      const regularFields = fields.filter(field => field.type !== 'AI-Generated');
      const aiFields = fields.filter(field => field.type === 'AI-Generated');
      
      // Generate data for regular fields using faker
      const data = Array.from({ length: count }, (_, rowIndex) => {
        const row: Record<string, any> = {};
        
        // Process regular fields with faker
        regularFields.forEach(field => {
          if (!field.type) return;
          
          try {
            row[field.name] = this.generateValueForField(field.type, field.options || {});
          } catch (error) {
            console.error(`Error generating value for field ${field.name}:`, error);
            row[field.name] = `Error: ${field.type}`;
          }
        });
        
        // Initialize AI fields with placeholder values
        // These will be replaced with AI-generated values later
        aiFields.forEach(field => {
          row[field.name] = `[AI: Generating...]`;
        });
        
        return row;
      });
      
      // If there are AI fields, enhance the data with AI-generated values
      if (aiFields.length > 0) {
        return await this.enhanceWithAIFields(data, aiFields, count, aiEnhancement);
      }
      
      return data;
    } catch (error) {
      console.error('Error generating test data:', error);
      throw error;
    }
  }
  
  /**
   * Enhances data with AI-generated values for specific fields
   */
  async enhanceWithAIFields(
    data: any[], 
    aiFields: FieldDefinition[], 
    totalCount: number, 
    aiEnhancement?: string
  ): Promise<any[]> {
    try {
      // Only process a sample of data if there's a lot to avoid token limitations
      const sampleSize = Math.min(5, data.length);
      const sampleData = data.slice(0, sampleSize);
      
      // Create a prompt for the AI to generate values for the specified fields
      const fieldDescriptions = aiFields.map(field => {
        const fieldName = field.name;
        const examples = field.options?.examples ? `Examples: ${field.options.examples}` : '';
        const constraints = field.options?.constraints ? `Constraints: ${field.options.constraints}` : '';
        
        return `Field: "${fieldName}"
${examples}
${constraints}`;
      }).join('\n\n');
      
      // Calculate a slightly higher count to request from the LLM to account for potential shortfalls
      const requestedCount = Math.ceil(totalCount * 1.15); // Request 15% more than needed
      
      const prompt = `You are a data generation expert. I need you to generate realistic data for specific fields in my dataset.

${aiEnhancement ? `IMPORTANT CONTEXT FOR ALL AI-GENERATED FIELDS: ${aiEnhancement}\n\n` : ''}

I have a dataset with ${totalCount} rows. For each row, I need you to generate values for the following fields:

${fieldDescriptions}

Here's a sample of the data structure (${sampleSize} out of ${totalCount} rows):
${JSON.stringify(sampleData, null, 2)}

CRITICAL REQUIREMENT: You MUST generate EXACTLY ${requestedCount} values for EACH field. No more, no less.

Return your response as a valid JSON object with this structure:
{
  "values": {
    "fieldName1": ["1|value1", "2|value2", "3|value3", ... ${requestedCount} total values],
    "fieldName2": ["1|value1", "2|value2", "3|value3", ... ${requestedCount} total values],
    ...
  }
}

Important requirements:
1. Generate EXACTLY ${requestedCount} values for each field - this is non-negotiable
2. Make sure values follow the context provided: "${aiEnhancement}"
3. Make sure values are realistic and diverse
4. Follow any constraints specified for each field
5. Return ONLY the JSON object with no additional text
6. Ensure high uniqueness and variety in the generated values
7. DO NOT STOP GENERATING until you have EXACTLY ${requestedCount} values for each field
8. Format each value with its number followed by a pipe character, like: "1|actual value", "2|another value", etc.
9. The pipe character (|) must be used to separate the number from the actual value

To help you keep track, number each value from 1 to ${requestedCount} using the format: "number|value".`;

      console.log("\n=== AI FIELD GENERATION PROMPT ===");
      console.log(prompt);
      console.log("=================================\n");
      
      // Call the AI service with the prompt
      const response = await this.aiService.generateContent(prompt, 'gemini-2.0-flash-thinking-exp-01-21');
      
      console.log("\n=== AI FIELD GENERATION RESPONSE ===");
      console.log(response);
      console.log("===================================\n");
      
      try {
        // Extract the JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Could not extract valid JSON from AI response");
        }
        
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        if (!parsedResponse.values) {
          throw new Error("AI response does not contain 'values' property");
        }
        
        // Ensure we have enough values for each field
        const processedValues: Record<string, string[]> = {};
        
        aiFields.forEach(field => {
          const fieldName = field.name;
          let fieldValues = parsedResponse.values[fieldName] || [];
          
          // Log the count of values received for this field
          console.log(`Received ${fieldValues.length} values for field "${fieldName}" (needed ${totalCount})`);
          
          // Clean up the values by removing the numbering prefix
          fieldValues = fieldValues.map((value: any) => {
            if (typeof value === 'string') {
              // Extract the actual value after the pipe character (|)
              const parts = value.split('|');
              if (parts.length > 1) {
                return parts.slice(1).join('|'); // Return everything after the first pipe
              }
              // If no pipe is found, return the original value
              return value;
            }
            return value;
          });
          
          if (fieldValues.length < totalCount) {
            // If we don't have enough values, generate synthetic ones to fill the gap
            console.log(`Generating ${totalCount - fieldValues.length} additional values for field "${fieldName}"`);
            
            // Use a pattern based on existing values to generate more
            const additionalValues = this.generateAdditionalValues(
              fieldName, 
              fieldValues, 
              totalCount - fieldValues.length
            );
            
            fieldValues = [...fieldValues, ...additionalValues];
          } else if (fieldValues.length > totalCount) {
            // If we have too many values, trim the excess
            fieldValues = fieldValues.slice(0, totalCount);
          }
          
          // Store the processed values
          processedValues[fieldName] = fieldValues;
        });
        
        // Replace the placeholder values with the AI-generated values
        const enhancedData = data.map((row, index) => {
          const enhancedRow = { ...row };
          
          aiFields.forEach(field => {
            const fieldName = field.name;
            if (processedValues[fieldName] && processedValues[fieldName][index]) {
              enhancedRow[fieldName] = processedValues[fieldName][index];
            }
          });
          
          return enhancedRow;
        });
        
        return enhancedData;
      } catch (error) {
        console.error("Error processing AI field generation response:", error);
        // Return the original data if there's an error
        return data;
      }
    } catch (error) {
      console.error("Error enhancing with AI fields:", error);
      // Return the original data if there's an error
      return data;
    }
  }
  
  /**
   * Generates additional values based on patterns in existing values
   */
  private generateAdditionalValues(fieldName: string, existingValues: string[], count: number): string[] {
    const additionalValues: string[] = [];
    
    // If we have no existing values, generate generic placeholders
    if (existingValues.length === 0) {
      for (let i = 0; i < count; i++) {
        additionalValues.push(`[Generated ${fieldName} #${i+1}]`);
      }
      return additionalValues;
    }
    
    // Analyze existing values to determine the type and pattern
    const sampleValue = existingValues[0];
    const isNumeric = !isNaN(Number(sampleValue));
    const containsLetters = /[a-zA-Z]/.test(sampleValue);
    
    for (let i = 0; i < count; i++) {
      // Use modulo to cycle through existing values as templates
      const templateIndex = i % existingValues.length;
      const template = existingValues[templateIndex];
      
      if (isNumeric) {
        // For numeric values, increment by a small amount
        const baseValue = Number(template);
        additionalValues.push(String(baseValue + i + 1));
      } else if (containsLetters) {
        // For text values, append a suffix to ensure uniqueness
        additionalValues.push(`${template} (variant ${i+1})`);
      } else {
        // For other types, use a simple approach
        additionalValues.push(`${template}_${i+1}`);
      }
    }
    
    return additionalValues;
  }
}