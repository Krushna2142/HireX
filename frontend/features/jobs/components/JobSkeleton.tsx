export default function JobSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border bg-white/60 p-4 ring-1 ring-black/5 dark:bg-neutral-900/60 dark:ring-white/10">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-neutral-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-neutral-700" />
          <div className="flex gap-3">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-neutral-700" />
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-neutral-700" />
            <div className="h-3 w-28 rounded bg-gray-200 dark:bg-neutral-700" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-neutral-700" />
            <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-neutral-700" />
            <div className="h-5 w-10 rounded-full bg-gray-200 dark:bg-neutral-700" />
          </div>
        </div>
      </div>
    </div>
  );
}