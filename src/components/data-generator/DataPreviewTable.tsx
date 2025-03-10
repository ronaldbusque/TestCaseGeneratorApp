import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { GeneratedTestData } from '@/lib/types/testData';

interface DataPreviewTableProps {
  data: GeneratedTestData[];
}

export function DataPreviewTable({ data }: DataPreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // Calculate total pages
  const totalPages = Math.ceil(data.length / rowsPerPage);
  
  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return data.slice(startIndex, endIndex);
  };
  
  // Get all column headers from data
  const getHeaders = () => {
    const headers = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });
    return Array.from(headers);
  };
  
  const headers = getHeaders();
  const currentPageData = getCurrentPageData();
  
  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
      <h2 className="text-xl font-bold text-white mb-4">Generated Data</h2>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase bg-slate-700 text-gray-300">
            <tr>
              {headers.map(header => (
                <th key={header} className="px-3 py-3 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentPageData.map((row, index) => (
              <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                {headers.map(header => (
                  <td key={`${index}-${header}`} className="px-3 py-2">
                    {typeof row[header] === 'object' 
                      ? JSON.stringify(row[header]) 
                      : String(row[header] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-gray-400 text-sm">
            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="px-2 py-1 text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 