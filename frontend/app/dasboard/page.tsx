'use client';

import Link from 'next/link';
import { useJobs } from '../../features/jobs/hooks/useJobs';
import JobCard from '../../features/jobs/components/JobCard';
import JobSkeleton from '../../features/jobs/components/JobSkeleton';
import { Button } from '../../components/ui/Button';

export default function DashboardPage() {
  const { data, isLoading } = useJobs();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white/70 p-6 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900/70 dark:ring-white/10">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm opacity-80">
          Here’s a snapshot of your job search and fresh matches.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Saved Jobs" value="6" delta="+2 this week" />
          <StatCard label="Applications" value="3" delta="+1 this week" />
          <StatCard label="Interviews" value="1" delta="Scheduled Fri" />
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/jobs">
            <Button>Browse Jobs</Button>
          </Link>
          <Button variant="outline">Upload Resume</Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recommended for you</h2>
          <Link href="/jobs" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <JobSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).slice(0, 3).map(job => (
              <JobCard key={job.id} job={job} />
            ))}
            {!data?.length && (
              <div className="col-span-full rounded-xl border p-10 text-center text-sm opacity-70">
                No recommendations yet. Try browsing jobs.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-xl border bg-white/70 p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900/70 dark:ring-white/10">
      <div className="text-sm opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {delta ? <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">{delta}</div> : null}
    </div>
  );
}