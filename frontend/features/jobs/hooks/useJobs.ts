/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery, useMutation, useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import {
  fetchJobs, applyToJob, fetchMyApplications,
  createJob, fetchRecruiterJobs, fetchJobApplicants,
  updateApplicationStatus, updateJobStatus,
} from '../api/jobsApi';
import { JobFilters } from '../types/Index';
import toast from 'react-hot-toast';

// ── Query keys ────────────────────────────────────────────────────────────────

export const JOB_KEYS = {
  all:           ['jobs'] as const,
  feed:          (f: JobFilters) => ['jobs', 'feed', f] as const,
  myApplications: ['jobs', 'applications', 'mine'] as const,
  recruiterJobs: ['jobs', 'recruiter', 'mine'] as const,
  applicants:    (jobId: string) => ['jobs', 'applicants', jobId] as const,
};

// ── Candidate: browse unified job feed ───────────────────────────────────────

export function useJobFeed(filters: JobFilters = {}) {
  return useQuery({
    queryKey: JOB_KEYS.feed(filters),
    queryFn:  () => fetchJobs(filters),
    staleTime: 60_000,        // 1 min — external jobs don't change second-to-second
    placeholderData: prev => prev,  // keep showing previous results while refetching
  });
}

// ── Candidate: infinite scroll job feed ──────────────────────────────────────

export function useInfiniteJobFeed(baseFilters: Omit<JobFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite', baseFilters],
    queryFn:  ({ pageParam = 1 }) => fetchJobs({ ...baseFilters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.flatMap(p => p.jobs).length;
      return fetched < lastPage.total ? allPages.length + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

// ── Candidate: apply to internal job ─────────────────────────────────────────

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      resumeId,
      coverLetter,
    }: { jobId: string; resumeId: string; coverLetter?: string }) =>
      applyToJob(jobId, resumeId, coverLetter),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.myApplications });
      toast.success('Application submitted successfully 🚀');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to apply');
    },
  });
}

// ── Candidate: own application history ───────────────────────────────────────

export function useMyApplications() {
  return useQuery({
    queryKey: JOB_KEYS.myApplications,
    queryFn:  fetchMyApplications,
  });
}

// ── Recruiter: create job posting ─────────────────────────────────────────────

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.recruiterJobs });
      toast.success(`"${job.title}" posted successfully 🎯`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create job');
    },
  });
}

// ── Recruiter: own jobs with pipeline stats ───────────────────────────────────

export function useRecruiterJobs() {
  return useQuery({
    queryKey: JOB_KEYS.recruiterJobs,
    queryFn:  fetchRecruiterJobs,
    refetchInterval: 30_000,   // safety net alongside Supabase Realtime
  });
}

// ── Recruiter: applicants for a job ──────────────────────────────────────────

export function useJobApplicants(jobId: string) {
  return useQuery({
    queryKey: JOB_KEYS.applicants(jobId),
    queryFn:  () => fetchJobApplicants(jobId),
    enabled:  !!jobId,
    refetchInterval: 15_000,
  });
}

// ── Recruiter: move applicant through pipeline ────────────────────────────────

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId, status, recruiterNotes,
    }: { applicationId: string; status: string; recruiterNotes?: string }) =>
      updateApplicationStatus(applicationId, status, recruiterNotes),

    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'applicants'] });
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.recruiterJobs });
      toast.success(`Applicant moved to "${vars.status}"`);
    },
  });
}

// ── Recruiter: update job status ──────────────────────────────────────────────

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId, status,
    }: { jobId: string; status: 'active' | 'paused' | 'closed' }) =>
      updateJobStatus(jobId, status),

    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: JOB_KEYS.recruiterJobs });
      const labels = { active: 'reactivated', paused: 'paused', closed: 'closed' };
      toast.success(`Job ${labels[vars.status]}`);
    },
  });
}