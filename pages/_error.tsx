import Link from 'next/link';
import type { NextPageContext } from 'next';

interface ErrorPageProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  const code = statusCode ?? 500;
  const description = code === 404 ? 'Page not found' : 'Something went wrong on our side.';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-blue-100">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-blue-300/70">Error {code}</p>
        <h1 className="text-3xl font-semibold text-white">{description}</h1>
        <p className="max-w-md text-sm text-blue-200">
          Try refreshing the page, or head back to the home screen to continue exploring the app.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-blue-600/80 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
        >
          Reload
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/20 px-6 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Home
        </Link>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
