export default function LoadingDashboard() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse rounded-2xl border p-6">
        <div className="h-6 w-48 rounded bg-gray-200 dark:bg-neutral-700" />
        <div className="mt-2 h-4 w-72 rounded bg-gray-200 dark:bg-neutral-700" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-neutral-700" />
              <div className="mt-2 h-6 w-16 rounded bg-gray-200 dark:bg-neutral-700" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border" />
        ))}
      </div>
    </div>
  );
}