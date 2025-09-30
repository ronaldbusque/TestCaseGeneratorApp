'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-blue-100">
        <ExclamationTriangleIcon className="h-12 w-12 text-amber-300" aria-hidden="true" />
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Something went wrong</h1>
          <p className="max-w-md text-sm sm:text-base text-blue-200">
            We hit an unexpected error while rendering this page. Try again or head back home.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-blue-600/80 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-6 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
