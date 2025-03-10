import { GeminiService } from './gemini';
import { 
  TestDataGenerationRequest, 
  TestDataGenerationResponse, 
  TestDataType,
  GeneratedTestData
} from '@/lib/types/testData';
import { fakerTypeDefinitions } from '@/lib/data/faker-type-definitions';

export class TestDataGeneratorService extends GeminiService {
  async generateTestData(request: TestDataGenerationRequest): Promise<TestDataGenerationResponse> {
    try {
      const { types, configuration, count = 10, aiEnhancement } = request;
      
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
      
      switch (typeName) {
        // Vehicle related
        case "Car Model Year":
          // Custom implementation for model year
          const currentYear = new Date().getFullYear();
          // Use min/max from config if provided
          const minYear = config.min ? Number(config.min) : 1950;
          const maxYear = config.max ? Number(config.max) : currentYear;
          return Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
          
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
          return faker.string.alphanumeric(config.length || 10);
          
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
  
  async generateTestDataFromFields(request: { fields: Array<{name: string, type: string, options: Record<string, any>}>, count: number }): Promise<TestDataGenerationResponse> {
    try {
      const { fields, count = 10 } = request;
      
      // Generate data for each field
      const result: Record<string, any>[] = [];
      
      for (let i = 0; i < count; i++) {
        const record: Record<string, any> = {};
        
        for (const field of fields) {
          record[field.name] = this.generateValueForField(field.type, field.options);
        }
        
        result.push(record);
      }
      
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
  
  private generateValueForField(type: string, options: Record<string, any>): any {
    try {
      // Dynamically import faker
      const { faker } = require('@faker-js/faker');
      
      // Special handling for specific types that might be causing issues
      if (type === 'Car Model Year') {
        // Create a custom implementation since modelYear may not exist
        const minYear = options.min || 1950;
        const maxYear = options.max || new Date().getFullYear();
        return Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
      }
      
      if (type === 'Buzzword') {
        // Direct access to faker method
        return faker.hacker.phrase();
      }
      
      // Basic numeric types
      if (type === 'Number') {
        const min = options.min !== undefined ? Number(options.min) : 1;
        const max = options.max !== undefined ? Number(options.max) : 1000;
        const precision = options.precision !== undefined ? Number(options.precision) : 0;
        
        if (precision > 0) {
          return Number((Math.random() * (max - min) + min).toFixed(precision));
        } else {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
      }
      
      if (type === 'Decimal Number') {
        const min = options.min !== undefined ? Number(options.min) : 0;
        const max = options.max !== undefined ? Number(options.max) : 100;
        const precision = options.precision !== undefined ? Number(options.precision) : 2;
        
        return Number((Math.random() * (max - min) + min).toFixed(precision));
      }
      
      // Date and time types
      if (type === 'Date' || type === 'Past Date' || type === 'Future Date' || type === 'Date of Birth') {
        let date;
        
        if (type === 'Date') {
          // Generate date between fromDate and toDate
          const fromDate = options.fromDate ? new Date(options.fromDate) : new Date(2020, 0, 1);
          const toDate = options.toDate ? new Date(options.toDate) : new Date(2023, 11, 31);
          date = faker.date.between({ from: fromDate, to: toDate });
        } else if (type === 'Past Date') {
          // Days ago
          const days = options.days ? Number(options.days) : 365;
          date = faker.date.past({ days });
        } else if (type === 'Future Date') {
          // Days from now
          const days = options.days ? Number(options.days) : 365;
          date = faker.date.future({ days });
        } else if (type === 'Date of Birth') {
          // Generate within age range
          const minAge = options.minAge ? Number(options.minAge) : 18;
          const maxAge = options.maxAge ? Number(options.maxAge) : 65;
          date = faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' });
        }
        
        // Format the date
        const format = options.format || 'ISO';
        
        if (format === 'ISO') {
          return date.toISOString();
        } else if (format === 'MM/DD/YYYY') {
          return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
        } else if (format === 'DD/MM/YYYY') {
          return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        } else if (format === 'YYYY-MM-DD') {
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        }
        
        return date.toISOString();
      }
      
      // Time type
      if (type === 'Time') {
        const now = new Date();
        const format = options.format || 'HH:MM:SS';
        
        if (format === 'HH:MM') {
          return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        } else if (format === 'HH:MM:SS') {
          return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        } else if (format === 'hh:MM AM/PM') {
          const hours = now.getHours();
          const amPm = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          return `${hour12}:${now.getMinutes().toString().padStart(2, '0')} ${amPm}`;
        }
        
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      }
      
      // Phone Number with formatting
      if (type === 'Phone Number') {
        const format = options.format || '';
        if (format) {
          return faker.phone.number(format);
        }
        return faker.phone.number();
      }
      
      // Social Security Number
      if (type === 'Social Security Number') {
        const format = options.format || '###-##-####';
        return faker.phone.number(format);
      }
      
      // Address types
      if (type === 'Address') {
        const includeSecondary = options.includeSecondary || false;
        return faker.location.streetAddress({ useFullAddress: includeSecondary });
      }
      
      if (type === 'Zip Code') {
        const format = options.format || '#####';
        return faker.location.zipCode(format);
      }
      
      // Custom List type
      if (type === 'Custom List') {
        const valuesList = options.values ? options.values.split(',').map((v: string) => v.trim()) : [];
        if (valuesList.length === 0) {
          return '';
        }
        return valuesList[Math.floor(Math.random() * valuesList.length)];
      }
      
      // Use the main method
      return this.generateDataByType(type, options);
    } catch (error) {
      console.error(`Error generating value for field type "${type}":`, error);
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
      
      // Create a prompt for the AI
      const prompt = `
You are a test data engineering expert. I have generated some test data and now want to enhance it based on the following instructions:

${aiEnhancement}

Here's a sample of the data I've generated:
\`\`\`json
${JSON.stringify(sampleData, null, 2)}
\`\`\`

Please provide two things:
1. A detailed explanation of how the data should be enhanced or transformed to meet the requirements.
2. A JavaScript function that I can use to process each row of my data to implement these enhancements.

Your JavaScript function should:
- Accept a single data row as input
- Return the enhanced/modified row
- Include comments explaining the logic
- Handle edge cases gracefully
- Be optimized for performance

Format your response as a valid JSON object like this:
{
  "explanation": "Your detailed explanation here",
  "function": "function enhanceData(row) { /* Your code here */ return enhancedRow; }"
}
`;

      console.log("=== AI ENHANCEMENT PROMPT ===");
      console.log(prompt);
      console.log("============================");
      
      // Call Gemini API
      const response = await this.generateContent(prompt, 'gemini-2.0-flash-thinking-exp-01-21');
      
      // Parse the response
      try {
        // Clean response and extract JSON
        let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Could not extract valid JSON from AI response");
        }
        
        const parsedResponse = JSON.parse(jsonMatch[0]);
        const enhancementFunction = new Function('row', `
          try {
            ${parsedResponse.function.replace(/^function enhanceData\(row\)\s*\{/, '').replace(/\}$/, '')}
          } catch (e) {
            console.error('Error in enhancement function:', e);
            return row;
          }
        `);
        
        // Apply the function to each data row
        const enhancedData = rawData.map(row => {
          try {
            return enhancementFunction(row);
          } catch (error) {
            console.error('Error applying enhancement to row:', error);
            return row;
          }
        });
        
        return {
          data: enhancedData,
          count: enhancedData.length,
          aiExplanation: parsedResponse.explanation
        };
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return {
          data: rawData,
          count: rawData.length,
          error: 'Failed to parse AI enhancement response',
          debug: {
            rawResponse: response,
            parseError: String(parseError)
          }
        };
      }
    } catch (error) {
      console.error('Error in AI enhancement:', error);
      // Return original data with error
      return {
        data: rawData,
        count: rawData.length,
        error: `AI enhancement failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}