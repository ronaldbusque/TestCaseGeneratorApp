'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  BeakerIcon, 
  DocumentCheckIcon, 
  CommandLineIcon, 
  TableCellsIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useProviderSettings } from '@/lib/context/ProviderSettingsContext';

export const NavigationBar = () => {
  const pathname = usePathname();
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [savedAccessToken, setSavedAccessToken] = useState<string | null>(null);
  const { settings, availableProviders } = useProviderSettings();

  const testCaseProvider = settings.testCases.provider;
  const testCaseModel = settings.testCases.model;
  const providerLabel = availableProviders.find((provider) => provider.id === testCaseProvider)?.label || 'OpenAI (Agents)';
  
  useEffect(() => {
    const storedToken = localStorage.getItem('appAccessToken');
    if (storedToken) {
      setAccessTokenInput(storedToken);
      setSavedAccessToken(storedToken);
      console.log('Access token found in localStorage.');
    }
  }, []);
  
  const handleSaveToken = () => {
    if (!accessTokenInput) return; // Don't save empty token
    localStorage.setItem('appAccessToken', accessTokenInput);
    setSavedAccessToken(accessTokenInput);
    // Provide feedback to the user
    alert('Access Token saved successfully!');
    console.log('Access token saved to localStorage. Token length:', accessTokenInput.length);
  };
  
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
              <Link
                href="/data-generator"
                className={`${
                  pathname === '/data-generator' 
                    ? 'border-blue-500 text-white' 
                    : 'border-transparent text-gray-300 hover:border-blue-300 hover:text-blue-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                <TableCellsIcon className="h-5 w-5 mr-1" />
                Test Data Generator
              </Link>
              <Link
                href="/settings"
                className={`${
                  pathname === '/settings'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-300 hover:border-blue-300 hover:text-blue-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                <Cog6ToothIcon className="h-5 w-5 mr-1" />
                Settings
              </Link>
            </div>
          </div>
          
          {/* Provider summary and Access Token Input */}
          <div className="flex items-center ml-auto pl-4 gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-blue-300 uppercase tracking-wide">Test Case Provider</span>
              <span className="text-sm text-blue-100">{providerLabel}</span>
              <span className="text-xs text-blue-200/80">Model: {testCaseModel}</span>
            </div>
            <input
              type="password"
              placeholder="Access Token"
              value={accessTokenInput}
              onChange={(e) => setAccessTokenInput(e.target.value)}
              className="px-2 py-1 text-sm bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-48"
              aria-label="Access Token Input"
            />
            <Button
              size="sm"
              variant="secondary"
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500"
              onClick={handleSaveToken}
              disabled={!accessTokenInput || accessTokenInput === savedAccessToken}
            >
              {savedAccessToken ? 'Update Token' : 'Save Token'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}; 
