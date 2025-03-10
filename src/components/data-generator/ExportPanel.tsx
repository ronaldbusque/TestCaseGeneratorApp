import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface ExportPanelProps {
  onExport: (format: string) => void;
}

export function ExportPanel({ onExport }: ExportPanelProps) {
  const exportFormats = [
    { id: 'csv', name: 'CSV' },
    { id: 'json', name: 'JSON' },
    { id: 'sql', name: 'SQL Insert' },
    { id: 'excel', name: 'Excel' }
  ];
  
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
        Export Data
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {exportFormats.map(format => (
          <button
            key={format.id}
            onClick={() => onExport(format.id)}
            className="bg-blue-600/70 hover:bg-blue-600 text-white flex items-center justify-center py-3 px-4 rounded-xl transition-colors"
          >
            {format.name}
          </button>
        ))}
      </div>
    </div>
  );
} 