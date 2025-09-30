import Link from 'next/link';

export default function ServerErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-blue-100">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-blue-300/70">Error 500</p>
        <h1 className="text-3xl font-semibold text-white">We hit a snag</h1>
        <p className="max-w-md text-sm text-blue-200">
          There was a server-side error while processing your request. Please try again or contact support if the problem persists.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-blue-600/80 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
      >
        Return home
      </Link>
    </main>
  );
}
