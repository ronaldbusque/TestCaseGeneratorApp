"use client";

import React from 'react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-blue-100">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-blue-300/70">Error 404</p>
        <h1 className="text-3xl font-semibold text-white">Page not found</h1>
        <p className="max-w-md text-sm text-blue-200">
          The page you requested does not exist or may have been moved. Check the URL or return to the home screen.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-blue-600/80 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
      >
        Back to home
      </Link>
    </main>
  );
}
