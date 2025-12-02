'use client';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '../api/jobsApi';
import { Job } from '../types/Job';

export function useJobs() {
  return useQuery<Job[]>({ queryKey: ['jobs'], queryFn: getJobs });
}