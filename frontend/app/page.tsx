'use client';
import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useJobs } from './../features/jobs/hooks/useJobs';
import JobCard from './../features/jobs/components/JobCard';
import JobSkeleton from './../features/jobs/components/JobSkeleton';

export default function JobsPage() {
  const { data, isLoading } = useJobs();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(j => {
      const hay = [j.title, j.company, j.location, ...(j.skills || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold tracking-tight">Job Feed</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 text-black/50 dark:text-white/50" size={18} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title, company, skill…"
              className="w-72 rounded-md border bg-white/80 pl-8 pr-3 py-2 text-sm shadow-sm ring-1 ring-black/10 placeholder:text-black/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-neutral-900/80 dark:placeholder:text-white/50 dark:ring-white/10"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
          {!filtered.length && (
            <div className="col-span-full rounded-xl border p-10 text-center text-sm opacity-70">
              No results. Try a different search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}