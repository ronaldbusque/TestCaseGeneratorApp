import { useState } from 'react';
import { TestDataType, GeneratedTestData } from '@/lib/types/testData';
import type { FieldOptions } from '@/lib/data-generator/types';

// Simple toast implementation since we don't have the actual toast component
interface Toast {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

// Simple toast hook simulation - in the actual app, you'd use the real toast component
const useToast = () => {
  const toast = (params: Toast) => {
    console.log(`TOAST: ${params.title} - ${params.description}`);
  };
  
  return { toast };
};

export function useTestDataGenerator() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [configOptions, setConfigOptions] = useState({
    rowCount: 10,
    typeConfigs: {} as Record<string, FieldOptions>,
    useDeterministicSeed: false,
    seedValue: '',
  });
  const [generatedData, setGeneratedData] = useState<GeneratedTestData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const { toast } = useToast();
  
  // Helper to map selected types to the expected format for the API
  const mapSelectedTypesToAPI = () => {
    return selectedTypes.map(typeName => ({
      name: typeName,
      category: '' // This would be populated from the full type definition if needed
    }));
  };
  
  // Function to generate data
  const generateData = async () => {
    if (selectedTypes.length === 0) {
      toast({
        title: 'No types selected',
        description: 'Please select at least one data type to generate',
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/data-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          types: mapSelectedTypesToAPI(),
          configuration: configOptions.typeConfigs,
          count: configOptions.rowCount
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          title: 'Generation Error',
          description: result.error,
          variant: 'destructive'
        });
      }
      
      if (result.data && result.data.length > 0) {
        setGeneratedData(result.data);
        toast({
          title: 'Data Generated',
          description: `Successfully generated ${result.data.length} records`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'No Data Generated',
          description: 'The generation process did not produce any data',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error generating data:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Function to enhance data with AI
  const aiEnhance = async (enhancementPrompt: string) => {
    if (!enhancementPrompt || !generatedData.length) {
      toast({
        title: 'Cannot Enhance',
        description: 'Please generate data first and provide enhancement instructions',
        variant: 'destructive'
      });
      return;
    }
    
    setIsAIProcessing(true);
    
    try {
      const response = await fetch('/api/data-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          types: mapSelectedTypesToAPI(),
          configuration: configOptions.typeConfigs,
          count: configOptions.rowCount,
          aiEnhancement: enhancementPrompt
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          title: 'Enhancement Error',
          description: result.error,
          variant: 'destructive'
        });
      }
      
      if (result.data && result.data.length > 0) {
        setGeneratedData(result.data);
        toast({
          title: 'Data Enhanced',
          description: result.aiExplanation 
            ? `AI Enhancement applied: ${result.aiExplanation.substring(0, 100)}...` 
            : 'Successfully enhanced data with AI',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error enhancing data:', error);
      toast({
        title: 'Enhancement Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsAIProcessing(false);
    }
  };
  
  // Function to export data in different formats
  const exportData = (format: string) => {
    if (!generatedData.length) {
      toast({
        title: 'No Data to Export',
        description: 'Please generate data first',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      let content: string = '';
      let mimeType: string = '';
      let filename: string = `test-data-${new Date().toISOString().slice(0, 10)}`;
      
      switch (format) {
        case 'csv':
          // Get all unique keys
          const headers = Array.from(new Set(generatedData.flatMap(row => Object.keys(row))));
          
          // Create CSV content
          content = [
            headers.join(','),
            ...generatedData.map(row => 
              headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
              }).join(',')
            )
          ].join('\n');
          
          mimeType = 'text/csv';
          filename = `${filename}.csv`;
          break;
          
        case 'json':
          content = JSON.stringify(generatedData, null, 2);
          mimeType = 'application/json';
          filename = `${filename}.json`;
          break;
          
        case 'sql':
          // Assume the first object has all fields for the table structure
          if (generatedData.length > 0) {
            const tableName = 'test_data';
            const columns = Object.keys(generatedData[0]);
            
            // Create INSERT statements
            const inserts = generatedData.map(row => {
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
              `-- Test data generated on ${new Date().toISOString()}`,
              `-- ${inserts.length} rows`,
              '',
              `CREATE TABLE ${tableName} (`,
              columns.map(col => `  ${col} VARCHAR(255)`).join(',\n'),
              ');',
              '',
              ...inserts
            ].join('\n');
          }
          
          mimeType = 'text/plain';
          filename = `${filename}.sql`;
          break;
          
        case 'excel':
          // For Excel, we'll create a CSV and rely on the browser to interpret it
          // In a real app, you'd use a library like xlsx or exceljs
          const xlsHeaders = Array.from(new Set(generatedData.flatMap(row => Object.keys(row))));
          
          content = [
            xlsHeaders.join(','),
            ...generatedData.map(row => 
              xlsHeaders.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
              }).join(',')
            )
          ].join('\n');
          
          mimeType = 'application/vnd.ms-excel';
          filename = `${filename}.xls`;
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Successful',
        description: `Exported ${generatedData.length} records as ${format.toUpperCase()}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  };
  
  // Function to clear generated data
  const clearData = () => {
    setGeneratedData([]);
    toast({
      title: 'Data Cleared',
      description: 'Generated data has been cleared',
      variant: 'default'
    });
  };
  
  return {
    selectedTypes,
    setSelectedTypes,
    configOptions,
    setConfigOptions,
    generatedData,
    isGenerating,
    isAIProcessing,
    generateData,
    aiEnhance,
    exportData,
    clearData
  };
} 
