'use client';

import { useState, useEffect } from 'react';
import { NetworkBackground } from '@/components/NetworkBackground';
import { NavigationBar } from '@/components/NavigationBar';
import { SchemaBuilder } from '@/components/data-generator/SchemaBuilder';
import { ExportOptions } from '@/components/data-generator/ExportOptions';
import { DataPreviewTable } from '@/components/data-generator/DataPreviewTable';
import { AIEnhancementPanel } from '@/components/data-generator/AIEnhancementPanel';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { v4 as uuidv4 } from 'uuid';
import { RawDataPreview } from '@/components/data-generator/RawDataPreview';
import { Tab } from '@headlessui/react';
import { TableCellsIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  options: Record<string, any>;
}

interface ExportConfig {
  rowCount: number;
  format: 'CSV' | 'JSON' | 'SQL' | 'Excel';
  lineEnding: 'Unix (LF)' | 'Windows (CRLF)';
  includeHeader: boolean;
  includeBOM: boolean;
}

// Simple toast implementation since we don't have the actual Toast component
interface Toast {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

// Mock useToast hook
const useToast = () => {
  const toast = (params: Toast) => {
    console.log(`TOAST: ${params.title} - ${params.description}`);
  };
  
  return { toast };
};

export default function TestDataGeneratorPage() {
  // Field definitions for the schema builder
  const [fields, setFields] = useState<FieldDefinition[]>([
    {
      id: uuidv4(),
      name: 'id',
      type: 'Number',
      options: { min: 1, max: 1000, decimals: 0 }
    }
  ]);
  
  // Export configuration
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    rowCount: 1000,
    format: 'CSV',
    lineEnding: 'Unix (LF)',
    includeHeader: true,
    includeBOM: false
  });
  
  // Data generation state
  const [previewDataRows, setPreviewDataRows] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIEnhancing, setIsAIEnhancing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Toast for showing notifications
  const { toast } = useToast();
  
  // Function to convert field definitions to API request format
  const mapFieldsToAPI = () => {
    return fields.map(field => ({
      name: field.name,
      type: field.type,
      options: field.options
    }));
  };
  
  // Function to generate test data
  const generateData = async () => {
    if (fields.length === 0) {
      toast({
        title: 'No fields defined',
        description: 'Please add at least one field with a type',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if all fields have types
    const missingTypes = fields.filter(field => !field.type);
    if (missingTypes.length > 0) {
      toast({
        title: 'Missing field types',
        description: `Please select types for all fields: ${missingTypes.map(f => f.name).join(', ')}`,
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
          fields: mapFieldsToAPI(),
          count: exportConfig.rowCount,
          format: exportConfig.format,
          options: {
            lineEnding: exportConfig.lineEnding,
            includeHeader: exportConfig.includeHeader,
            includeBOM: exportConfig.includeBOM
          }
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          title: 'Generation Error',
          description: result.error,
          variant: 'destructive'
        });
      } else if (result.data && result.data.length > 0) {
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
  const enhanceDataWithAI = async (prompt: string) => {
    if (!prompt || !isPreviewMode || previewDataRows.length === 0) {
      toast({
        title: 'Cannot Enhance',
        description: 'Please preview data first and provide enhancement instructions',
        variant: 'destructive'
      });
      return;
    }
    
    setIsAIEnhancing(true);
    
    try {
      const response = await fetch('/api/data-generator/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: previewDataRows.slice(0, 10), // Send sample for AI to understand the structure
          prompt,
          fields: mapFieldsToAPI()
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          title: 'Enhancement Error',
          description: result.error,
          variant: 'destructive'
        });
      } else if (result.data && result.data.length > 0) {
        setPreviewDataRows(result.data);
        toast({
          title: 'Data Enhanced',
          description: result.aiExplanation 
            ? `${result.aiExplanation.substring(0, 100)}${result.aiExplanation.length > 100 ? '...' : ''}`
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
      setIsAIEnhancing(false);
    }
  };
  
  // Function to export data
  const exportData = async () => {
    if (fields.length === 0) {
      toast({
        title: 'No fields defined',
        description: 'Please add at least one field with a type',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if all fields have types
    const missingTypes = fields.filter(field => !field.type);
    if (missingTypes.length > 0) {
      toast({
        title: 'Missing field types',
        description: `Please select types for all fields: ${missingTypes.map(f => f.name).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate data directly
      const response = await fetch('/api/data-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: mapFieldsToAPI(),
          count: exportConfig.rowCount,
          format: exportConfig.format,
          options: {
            lineEnding: exportConfig.lineEnding,
            includeHeader: exportConfig.includeHeader,
            includeBOM: exportConfig.includeBOM
          }
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          title: 'Generation Error',
          description: result.error,
          variant: 'destructive'
        });
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        toast({
          title: 'No Data Generated',
          description: 'The generation process did not produce any data',
          variant: 'destructive'
        });
        return;
      }
      
      // Properly type the data to fix type errors
      const generatedData: Record<string, any>[] = result.data;
      
      // Directly create and download the file without storing the generated data
      let content: string = '';
      let mimeType: string = '';
      let filename: string = `test-data-${new Date().toISOString().slice(0, 10)}`;
      let lineEndingChar = exportConfig.lineEnding === 'Unix (LF)' ? '\n' : '\r\n';
      
      switch (exportConfig.format) {
        case 'CSV':
          // Get all unique keys
          const headers = Array.from(new Set(generatedData.flatMap(row => Object.keys(row))));
          
          // Create CSV content
          if (exportConfig.includeHeader) {
            content = headers.join(',') + lineEndingChar;
          }
          
          content += generatedData.map((row: Record<string, any>) => 
            headers.map(header => {
              const value = row[header];
              return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
          ).join(lineEndingChar);
          
          // Add BOM if needed
          if (exportConfig.includeBOM) {
            content = '\ufeff' + content;
          }
          
          mimeType = 'text/csv';
          filename = `${filename}.csv`;
          break;
          
        case 'JSON':
          content = JSON.stringify(generatedData, null, 2);
          mimeType = 'application/json';
          filename = `${filename}.json`;
          break;
          
        case 'SQL':
          // Assume the first object has all fields for the table structure
          if (generatedData.length > 0) {
            const tableName = 'test_data';
            const columns = Object.keys(generatedData[0]);
            
            // Create INSERT statements
            const inserts = generatedData.map((row: Record<string, any>) => {
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
            ].join(lineEndingChar);
          }
          
          mimeType = 'text/plain';
          filename = `${filename}.sql`;
          break;
          
        case 'Excel':
          // For Excel, use CSV with appropriate format
          const xlsHeaders = Array.from(new Set(generatedData.flatMap(row => Object.keys(row))));
          
          // Create CSV content suitable for Excel
          if (exportConfig.includeHeader) {
            content = xlsHeaders.join(',') + lineEndingChar;
          }
          
          content += generatedData.map((row: Record<string, any>) => 
            xlsHeaders.map(header => {
              const value = row[header];
              return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
          ).join(lineEndingChar);
          
          // Add BOM for Excel compatibility
          content = '\ufeff' + content;
          
          mimeType = 'application/vnd.ms-excel';
          filename = `${filename}.xlsx`;
          break;
          
        default:
          throw new Error(`Unsupported export format: ${exportConfig.format}`);
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
        description: `Exported ${generatedData.length} records as ${exportConfig.format}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to preview data
  const generatePreview = async () => {
    if (fields.length === 0) {
      toast({
        title: 'No fields defined',
        description: 'Please add at least one field with a type',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if all fields have types
    const missingTypes = fields.filter(field => !field.type);
    if (missingTypes.length > 0) {
      toast({
        title: 'Missing field types',
        description: `Please select types for all fields: ${missingTypes.map(f => f.name).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Use a smaller count for preview (max 100)
      const previewCount = Math.min(100, exportConfig.rowCount);
      
      const response = await fetch('/api/data-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: mapFieldsToAPI(),
          count: previewCount,
          format: exportConfig.format,
          options: {
            lineEnding: exportConfig.lineEnding,
            includeHeader: exportConfig.includeHeader,
            includeBOM: exportConfig.includeBOM
          }
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        toast({
          title: 'Preview Generation Error',
          description: result.error,
          variant: 'destructive'
        });
        setPreviewDataRows([]);
      } else if (result.data && result.data.length > 0) {
        setPreviewDataRows(result.data);
        setIsPreviewMode(true);
        toast({
          title: 'Preview Generated',
          description: `Preview of ${result.data.length} records`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'No Preview Data Generated',
          description: 'The generation process did not produce any preview data',
          variant: 'destructive'
        });
        setPreviewDataRows([]);
      }
    } catch (error) {
      console.error('Error generating preview data:', error);
      toast({
        title: 'Preview Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
      setPreviewDataRows([]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to clear preview mode
  const clearPreview = () => {
    setPreviewDataRows([]);
    setIsPreviewMode(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <NetworkBackground />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">Test Data Generator</h1>
        
        <div className="space-y-6">
          {/* Schema Builder */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Define Your Schema</h2>
            <SchemaBuilder 
              fields={fields}
              onChange={setFields}
            />
          </div>
          
          {/* Export Options */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Export Options</h2>
            <ExportOptions
              config={exportConfig}
              onConfigChange={setExportConfig}
              onExport={exportData}
              onPreview={generatePreview}
            />
          </div>
          
          {/* AI Enhancement Panel */}
          <div className="mb-6">
            <AIEnhancementPanel
              onEnhance={enhanceDataWithAI}
              isProcessing={isAIEnhancing}
            />
          </div>
          
          {/* Preview Data Section */}
          {isPreviewMode && previewDataRows.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-white">Data Preview</h2>
                <button
                  onClick={clearPreview}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close Preview
                </button>
              </div>
              
              <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-xl bg-slate-700/50 p-1 mb-4">
                  <Tab className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                     ${selected
                       ? 'bg-blue-600 text-white shadow'
                       : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                     } flex items-center justify-center`
                  }>
                    <TableCellsIcon className="h-5 w-5 mr-2" />
                    Table View
                  </Tab>
                  <Tab className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                     ${selected
                       ? 'bg-blue-600 text-white shadow'
                       : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                     } flex items-center justify-center`
                  }>
                    <CodeBracketIcon className="h-5 w-5 mr-2" />
                    Raw Format ({exportConfig.format})
                  </Tab>
                </Tab.List>
                <Tab.Panels>
                  <Tab.Panel>
                    <DataPreviewTable data={previewDataRows} />
                  </Tab.Panel>
                  <Tab.Panel>
                    <RawDataPreview 
                      data={previewDataRows}
                      format={exportConfig.format}
                      options={{
                        lineEnding: exportConfig.lineEnding,
                        includeHeader: exportConfig.includeHeader,
                        includeBOM: exportConfig.includeBOM
                      }}
                    />
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          )}
          
          {/* Loading Indicator */}
          {isGenerating && (
            <div className="flex justify-center items-center p-12 bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700">
              <LoadingAnimation message="Generating test data..." />
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 