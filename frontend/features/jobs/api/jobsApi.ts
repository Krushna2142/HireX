import api from '@/lib/axios';
import {
  JobsResponse, Application, RecruiterJob,
  JobFilters, UnifiedJob,
} from '../types/Index';

// ── Candidate: browse unified feed ───────────────────────────────────────────

export async function fetchJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (filters.search)                  params.set('search',          filters.search);
  if (filters.workMode)                params.set('workMode',         filters.workMode);
  if (filters.salaryMin)               params.set('salaryMin',        String(filters.salaryMin));
  if (filters.skills?.length)          params.set('skills',           filters.skills.join(','));
  if (filters.page)                    params.set('page',             String(filters.page));
  if (filters.includeExternal === false) params.set('includeExternal', 'false');

  const { data } = await api.get<JobsResponse>(`/jobs?${params}`);
  return data;
}

// ── Candidate: apply to internal job ─────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  resumeId: string,
  coverLetter?: string,
): Promise<Application> {
  const { data } = await api.post<Application>(`/jobs/${jobId}/apply`, {
    resumeId,
    coverLetter,
  });
  return data;
}

// ── Candidate: own applications ───────────────────────────────────────────────

export async function fetchMyApplications(): Promise<Application[]> {
  const { data } = await api.get<Application[]>('/jobs/applications/mine');
  return data;
}

// ── Recruiter: create job posting ─────────────────────────────────────────────

export async function createJob(dto: Partial<RecruiterJob>): Promise<UnifiedJob> {
  const { data } = await api.post<UnifiedJob>('/jobs', dto);
  return data;
}

// ── Recruiter: own job postings with pipeline stats ──────────────────────────

export async function fetchRecruiterJobs(): Promise<RecruiterJob[]> {
  const { data } = await api.get<RecruiterJob[]>('/jobs/mine');
  return data;
}

// ── Recruiter: applicants for a job ──────────────────────────────────────────

export async function fetchJobApplicants(jobId: string) {
  const { data } = await api.get(`/jobs/${jobId}/applicants`);
  return data;
}

// ── Recruiter: move applicant through pipeline ────────────────────────────────

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  recruiterNotes?: string,
) {
  const { data } = await api.patch(
    `/jobs/applications/${applicationId}/status`,
    { status, recruiterNotes },
  );
  return data;
}

// ── Recruiter: update job status ──────────────────────────────────────────────

export async function updateJobStatus(
  jobId: string,
  status: 'active' | 'paused' | 'closed',
) {
  const { data } = await api.patch(`/jobs/${jobId}/status`, { status });
  return data;
}