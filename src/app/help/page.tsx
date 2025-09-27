'use client';

import Link from 'next/link';
import { 
  DocumentCheckIcon, 
  CommandLineIcon, 
  TableCellsIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
          Getting Started
        </h1>
        <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
          Learn how to use QualityForge AI tools to enhance your testing workflow.
        </p>
      </div>
      
      <div className="space-y-16">
        {/* Test Case Generator Section */}
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <div className="flex items-center mb-6">
            <DocumentCheckIcon className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Test Case Generator</h2>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-blue-100">
              The Test Case Generator helps you create comprehensive test cases for your software using AI. 
              It can analyze requirements and generate both high-level and detailed test cases.
            </p>
            
            <h3 className="text-xl font-semibold text-white mt-6">How to Use:</h3>
            
            <ol className="list-decimal pl-6 space-y-4 text-blue-100">
              <li>
                <strong className="text-white">Upload Requirements</strong>: Upload your requirements document or paste text directly into the input field.
              </li>
              <li>
                <strong className="text-white">Select Test Case Mode</strong>: Choose between high-level test cases (scenarios) or detailed test cases.
              </li>
              <li>
                <strong className="text-white">Generate Test Cases</strong>: Click the &quot;Generate&quot; button to create test cases based on your requirements.
              </li>
              <li>
                <strong className="text-white">Review and Export</strong>: Review the generated test cases and export them in your preferred format.
              </li>
            </ol>
            
            <div className="mt-8">
              <Link 
                href="/" 
                className="inline-flex items-center text-blue-400 hover:text-blue-300"
              >
                Try Test Case Generator
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
        
        {/* SQL Assistant Section */}
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <div className="flex items-center mb-6">
            <CommandLineIcon className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">SQL Assistant</h2>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-blue-100">
              The SQL Assistant helps you generate, validate, and convert SQL queries using AI. 
              It supports multiple SQL dialects and can work with your database schema.
            </p>
            
            <h3 className="text-xl font-semibold text-white mt-6">Features:</h3>
            
            <ul className="list-disc pl-6 space-y-4 text-blue-100">
              <li>
                <strong className="text-white">Generate SQL</strong>: Describe what you need in plain English, and the AI will create the SQL query.
              </li>
              <li>
                <strong className="text-white">Validate SQL</strong>: Check your SQL queries for syntax errors, performance issues, and best practices.
              </li>
              <li>
                <strong className="text-white">Convert SQL</strong>: Convert SQL queries between different dialects (MySQL, PostgreSQL, Oracle, etc.).
              </li>
              <li>
                <strong className="text-white">Schema Support</strong>: Provide your database schema for more accurate SQL generation and validation.
              </li>
            </ul>
            
            <div className="mt-8">
              <Link 
                href="/sql" 
                className="inline-flex items-center text-blue-400 hover:text-blue-300"
              >
                Try SQL Assistant
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
        
        {/* Test Data Generator Section (Coming Soon) */}
        <section className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/10 opacity-80">
          <div className="flex items-center mb-6">
            <TableCellsIcon className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">
              Test Data Generator
              <span className="ml-3 bg-blue-600/30 text-blue-200 text-xs px-2 py-1 rounded-full">Coming Soon</span>
            </h2>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-blue-100">
              The Test Data Generator will help you create realistic test data for your applications.
              It will support various data types and formats, making it easy to populate your test environments.
            </p>
            
            <h3 className="text-xl font-semibold text-white mt-6">Planned Features:</h3>
            
            <ul className="list-disc pl-6 space-y-4 text-blue-100">
              <li>
                <strong className="text-white">Schema-based Generation</strong>: Generate data based on your database schema.
              </li>
              <li>
                <strong className="text-white">Custom Data Rules</strong>: Define rules for generating specific types of data.
              </li>
              <li>
                <strong className="text-white">Multiple Export Formats</strong>: Export data in CSV, JSON, SQL, and other formats.
              </li>
              <li>
                <strong className="text-white">Realistic Data</strong>: Generate realistic names, addresses, phone numbers, and more.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
} 
