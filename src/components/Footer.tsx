'use client';

import Link from 'next/link';
import { EnvelopeIcon, QuestionMarkCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-900/80 backdrop-blur-lg border-t border-white/10 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">QualityForge AI</h3>
            <p className="text-blue-100 text-sm">
              AI-powered tools for test case generation, SQL assistance, and test data generation.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-blue-300 hover:text-blue-100 text-sm flex items-center">
                  <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
                  Getting Started
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-blue-300 hover:text-blue-100 text-sm flex items-center">
                  <InformationCircleIcon className="h-4 w-4 mr-2" />
                  About
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
            <a 
              href="mailto:ronaldallan.busque@gmail.com" 
              className="text-blue-300 hover:text-blue-100 text-sm flex items-center"
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              ronaldallan.busque@gmail.com
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
          <p className="text-blue-200 text-sm">
            &copy; {currentYear} QualityForge AI. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <ul className="flex space-x-6">
              <li>
                <Link href="/privacy" className="text-blue-300 hover:text-blue-100 text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-blue-300 hover:text-blue-100 text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}; 