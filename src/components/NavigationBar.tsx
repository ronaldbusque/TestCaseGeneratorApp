'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BeakerIcon, 
  DocumentCheckIcon, 
  CommandLineIcon, 
  TableCellsIcon 
} from '@heroicons/react/24/outline';

export const NavigationBar = () => {
  const pathname = usePathname();
  
  return (
    <nav className="bg-slate-900/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <BeakerIcon className="h-8 w-8 text-blue-500" />
                <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
                  QualityForge AI
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`${
                  pathname === '/' 
                    ? 'border-blue-500 text-white' 
                    : 'border-transparent text-gray-300 hover:border-blue-300 hover:text-blue-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                <DocumentCheckIcon className="h-5 w-5 mr-1" />
                Test Case Generator
              </Link>
              <Link
                href="/sql"
                className={`${
                  pathname === '/sql' 
                    ? 'border-blue-500 text-white' 
                    : 'border-transparent text-gray-300 hover:border-blue-300 hover:text-blue-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                <CommandLineIcon className="h-5 w-5 mr-1" />
                SQL Assistant
              </Link>
              <div className="border-transparent text-gray-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-not-allowed">
                <TableCellsIcon className="h-5 w-5 mr-1" />
                Test Data Generator
                <span className="ml-2 bg-blue-600/30 text-blue-200 text-xs px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}; 