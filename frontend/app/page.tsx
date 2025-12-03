'use client';

import Hero from '@/components/Hero';
import { useJobs } from '../features/jobs/hooks/useJobs';

export default function JobsPage() {
  const { data, isLoading, error } = useJobs();

  if (isLoading) return <div>Loading jobs…</div>;
  if (error) return <div>Failed to load jobs</div>;

  return (
    <main className="p-4">
      <Hero/>
      <h1 className="mb-4 text-xl font-semibold">Jobs</h1>
      <ul className="space-y-2">
        {data?.map((j) => (
          <li key={j.id} className="rounded border p-3">
            <div className="font-medium">{j.title}</div>
            {j.company && <div className="text-sm opacity-70">{j.company}</div>}
          </li>
        ))}
      </ul>
    </main>
  );
}