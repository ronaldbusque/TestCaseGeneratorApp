'use client';

import Link from 'next/link';
import { BeakerIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
          About QualityForge AI
        </h1>
        <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
          Empowering QA professionals with AI-powered testing tools
        </p>
      </div>
      
      <div className="space-y-16">
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <div className="flex items-center mb-6">
            <BeakerIcon className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Our Mission</h2>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-blue-100">
              QualityForge AI was created to revolutionize the way QA professionals approach testing. 
              By leveraging the power of artificial intelligence, we aim to make testing more efficient, 
              comprehensive, and accessible.
            </p>
            
            <p className="text-blue-100 mt-4">
              Our suite of tools is designed to streamline the testing process, from generating test cases 
              to creating SQL queries and test data. We believe that by automating the repetitive aspects 
              of testing, QA professionals can focus on what truly matters: ensuring software quality.
            </p>
          </div>
        </section>
        
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Our Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-3">Test Case Generator</h3>
              <p className="text-blue-100 text-sm mb-4">
                Generate comprehensive test cases from requirements using AI.
              </p>
              <Link 
                href="/" 
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Learn more
              </Link>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-3">SQL Assistant</h3>
              <p className="text-blue-100 text-sm mb-4">
                Generate, validate, and convert SQL queries with AI assistance.
              </p>
              <Link 
                href="/sql" 
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Learn more
              </Link>
            </div>
            
            <div className="bg-white/5 p-6 rounded-xl border border-white/10 opacity-80">
              <h3 className="text-xl font-semibold text-white mb-3">
                Test Data Generator
                <span className="ml-2 bg-blue-600/30 text-blue-200 text-xs px-2 py-0.5 rounded-full">Coming Soon</span>
              </h3>
              <p className="text-blue-100 text-sm mb-4">
                Create realistic test data for your applications.
              </p>
            </div>
          </div>
        </section>
        
        <section className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Contact</h2>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-blue-100">
              Have questions or suggestions? Feel free to reach out to us.
            </p>
            
            <div className="mt-4">
              <a 
                href="mailto:ronaldallan.busque@gmail.com" 
                className="inline-flex items-center text-blue-400 hover:text-blue-300"
              >
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                ronaldallan.busque@gmail.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 