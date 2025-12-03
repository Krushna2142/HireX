'use client';

import { useQuery } from '@tanstack/react-query';

export type Job = {
  id: string;
  title: string;
  company?: string;
  location?: string;
};

async function getJobs(): Promise<Job[]> {
  // Adjust endpoint to your API path
  const res = await fetch('/api/jobs', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: getJobs
  });
}