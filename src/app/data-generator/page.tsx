'use client';

import { useState, useEffect } from 'react';
import { SchemaBuilder } from '@/components/data-generator/SchemaBuilder';
import { ExportOptions } from '@/components/data-generator/ExportOptions';
import { DataPreviewTable } from '@/components/data-generator/DataPreviewTable';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { v4 as uuidv4 } from 'uuid';
import { RawDataPreview } from '@/components/data-generator/RawDataPreview';
import { Tab } from '@headlessui/react';
import { TableCellsIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { DataGeneratorLoading } from '@/components/data-generator/DataGeneratorLoading';

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
  applyAIEnhancement: boolean;
  enhancementPrompt: string;
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
    rowCount: 100,
    format: 'CSV',
    lineEnding: 'Unix (LF)',
    includeHeader: true,
    includeBOM: false,
    applyAIEnhancement: false,
    enhancementPrompt: ''
  });
  
  // Data generation state
  const [previewDataRows, setPreviewDataRows] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
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
  
  // Function to generate and export data
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
    
    // Check if there are AI-Generated fields but no context is provided
    const hasAIGeneratedFields = fields.some(field => field.type === 'AI-Generated');
    if (hasAIGeneratedFields && !exportConfig.enhancementPrompt.trim()) {
      toast({
        title: 'AI Context Missing',
        description: 'You have AI-Generated fields but no context is provided. Please add context to help the AI generate appropriate values.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate the data
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
          },
          // Include AI enhancement if there's a prompt
          ...(exportConfig.enhancementPrompt.trim() 
            ? { aiEnhancement: exportConfig.enhancementPrompt.trim() } 
            : {})
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      let generatedData = await response.json();
      
      // Success toast for AI enhancement
      if (exportConfig.enhancementPrompt.trim() && !generatedData.error && hasAIGeneratedFields) {
        toast({
          title: 'Data Generated with AI Enhancement',
          description: 'Successfully generated data with AI-Generated fields',
          variant: 'default'
        });
      }
      
      // Create a download based on the format
      let fileContent = '';
      let fileName = `test-data-${new Date().toISOString().slice(0, 10)}`;
      let fileType = '';
      
      if (exportConfig.format === 'CSV') {
        const { data, fields: csvFields } = generatedData;
        // Create header row
        const header = exportConfig.includeHeader 
          ? Object.keys(data[0]).join(',') + (exportConfig.lineEnding === 'Windows (CRLF)' ? '\r\n' : '\n')
          : '';
          
        // Create content rows
        const rows = data.map((row: any) => 
          Object.values(row).map(value => 
            typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
          ).join(',')
        ).join(exportConfig.lineEnding === 'Windows (CRLF)' ? '\r\n' : '\n');
        
        fileContent = header + rows;
        fileName += '.csv';
        fileType = 'text/csv';
        
        // Add BOM if requested
        if (exportConfig.includeBOM) {
          fileContent = '\ufeff' + fileContent;
        }
      } else if (exportConfig.format === 'JSON') {
        fileContent = JSON.stringify(generatedData.data, null, 2);
        fileName += '.json';
        fileType = 'application/json';
      } else if (exportConfig.format === 'SQL') {
        // Build SQL insert statements
        const { data } = generatedData;
        const tableName = 'test_data';
        const columns = Object.keys(data[0]);
        
        fileContent = data.map((row: any) => {
          const values = Object.values(row).map(value => {
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            return value;
          }).join(', ');
          
          return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
        }).join(exportConfig.lineEnding === 'Windows (CRLF)' ? '\r\n' : '\n');
        
        fileName += '.sql';
        fileType = 'text/plain';
      } else if (exportConfig.format === 'Excel') {
        // For Excel, we need to redirect to a server endpoint that will generate the Excel file
        const excelResponse = await fetch('/api/data-generator/export-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: generatedData.data })
        });
        
        if (!excelResponse.ok) {
          throw new Error(`Excel generation failed: ${excelResponse.statusText}`);
        }
        
        const blob = await excelResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        setIsGenerating(false);
        return;
      }
      
      // Create and trigger download
      const blob = new Blob([fileContent], { type: fileType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast({
        title: 'Export Successful',
        description: `Generated ${generatedData.data.length} rows of data.`,
        variant: 'default'
      });
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
  
  // Function to generate preview
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
    
    // Check if there are AI-Generated fields but no context is provided
    const hasAIGeneratedFields = fields.some(field => field.type === 'AI-Generated');
    if (hasAIGeneratedFields && !exportConfig.enhancementPrompt.trim()) {
      toast({
        title: 'AI Context Missing',
        description: 'You have AI-Generated fields but no context is provided. Please add context to help the AI generate appropriate values.',
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
          },
          // Include AI enhancement if there's a prompt
          ...(exportConfig.enhancementPrompt.trim() 
            ? { aiEnhancement: exportConfig.enhancementPrompt.trim() } 
            : {})
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
      
      // Set preview data and switch to preview mode
      setPreviewDataRows(result.data);
      setIsPreviewMode(true);
      
      // Success toast for AI enhancement
      if (exportConfig.enhancementPrompt.trim() && !result.error && hasAIGeneratedFields) {
        toast({
          title: 'Data Generated with AI Enhancement',
          description: 'Successfully generated data with AI-Generated fields',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Preview Generated',
          description: `Generated ${result.data.length} rows of data for preview.`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: 'Preview Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Function to clear preview
  const clearPreview = () => {
    setPreviewDataRows([]);
    setIsPreviewMode(false);
  };
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
          Test Data Generator
        </h1>
        <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
          Create realistic test data with AI-powered enhancement capabilities
        </p>
      </div>
      
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
            hasAIGeneratedFields={fields.some(field => field.type === 'AI-Generated')}
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
            <DataGeneratorLoading message="Generating test data..." />
          </div>
        )}
      </div>
    </main>
  );
} 