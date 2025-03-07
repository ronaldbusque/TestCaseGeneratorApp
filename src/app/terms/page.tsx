'use client';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
          Guidelines for using QualityForge AI
        </p>
      </div>
      
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
        <div className="prose prose-invert max-w-none">
          <p className="text-blue-100">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-blue-100">
            By accessing or using QualityForge AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Description of Service</h2>
          <p className="text-blue-100">
            QualityForge AI provides AI-powered tools for test case generation, SQL assistance, and test data generation. Our services are designed to help QA professionals streamline their testing processes.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. User Responsibilities</h2>
          <p className="text-blue-100">
            You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Intellectual Property</h2>
          <p className="text-blue-100">
            All content, features, and functionality of QualityForge AI, including but not limited to text, graphics, logos, and software, are owned by QualityForge AI and are protected by copyright, trademark, and other intellectual property laws.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Limitation of Liability</h2>
          <p className="text-blue-100">
            QualityForge AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Changes to Terms</h2>
          <p className="text-blue-100">
            We reserve the right to modify these Terms of Service at any time. We will notify you of any changes by posting the new Terms of Service on this page.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Contact Us</h2>
          <p className="text-blue-100">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p className="text-blue-100">
            <a href="mailto:ronaldallan.busque@gmail.com" className="text-blue-400 hover:text-blue-300">
              ronaldallan.busque@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 