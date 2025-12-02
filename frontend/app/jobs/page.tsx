'use client';
import { useJobs } from '../../features/jobs/hooks/useJobs';
import JobCard from '../../features/jobs/components/JobCard';
import JobSkeleton from '../../features/jobs/components/JobSkeleton';
import { useState, useMemo } from 'react';

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
      <h1 className="text-3xl font-bold tracking-tight">Job Feed</h1>
      <div className="mt-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search title, company, skill…"
          className="w-72 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
            <div className="col-span-full rounded border p-8 text-center text-sm opacity-70">
              No results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}