'use client';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 sm:text-5xl lg:text-6xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-blue-100 sm:text-xl max-w-3xl mx-auto">
          How we handle your data
        </p>
      </div>
      
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
        <div className="prose prose-invert max-w-none">
          <p className="text-blue-100">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Introduction</h2>
          <p className="text-blue-100">
            QualityForge AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Information We Collect</h2>
          <p className="text-blue-100">
            We may collect information that you provide directly to us, such as when you use our services, contact us, or participate in any interactive features of our services.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-blue-100">
            We use the information we collect to provide, maintain, and improve our services, to develop new services, and to protect our users.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Data Security</h2>
          <p className="text-blue-100">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Changes to This Privacy Policy</h2>
          <p className="text-blue-100">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Contact Us</h2>
          <p className="text-blue-100">
            If you have any questions about this Privacy Policy, please contact us at:
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