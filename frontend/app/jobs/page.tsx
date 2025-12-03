'use client';

import { useJobs } from '../../features/jobs/hooks/useJobs';
import { JobCard } from '../../features/jobs/components/JobCard';
import { useState, useMemo } from 'react';

export default function JobsPage() {
  const { data, isLoading } = useJobs();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company ?? '').toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q)
    );
  }, [data, query]);

  return (
    <main className="page-gradient mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Job Feed</h1>
      <div className="mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, company, skill..."
          className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(filtered ?? []).map((j) => (
          <JobCard key={j.id} title={j.title} company={j.company ?? ''} location={j.location ?? ''} tags={[]} />
        ))}
      </div>
    </main>
  );
}