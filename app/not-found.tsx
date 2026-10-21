import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-[#090D16]">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-[#0F1623]">
        <div className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          404 · Route Not Found
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          CrosX Internal Panel
        </h1>
        <p className="mt-2 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          The requested attribution or campaign route could not be located. Return to the main operations workspace.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
