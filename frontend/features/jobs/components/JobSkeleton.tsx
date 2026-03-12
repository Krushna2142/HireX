'use client';// frontend/features/jobs/components/JobSkeleton.tsx

export default function JobSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}