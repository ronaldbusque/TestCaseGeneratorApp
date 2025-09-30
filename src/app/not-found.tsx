import Link from 'next/link';
import { BeakerIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center text-blue-100">
      <BeakerIcon className="h-12 w-12 text-blue-400" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Page not found</h1>
        <p className="max-w-md text-sm sm:text-base text-blue-200">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-blue-600/80 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
      >
        Back to home
      </Link>
    </div>
  );
}
