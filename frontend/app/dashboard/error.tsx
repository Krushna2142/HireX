'use client';

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border p-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong.</h2>
      <p className="mt-1 text-sm opacity-70">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 inline-flex rounded-md border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        Try again
      </button>
    </div>
  );
}