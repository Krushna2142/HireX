export type JobSource = 'internal' | 'serpapi';

export type ApplicationStatus =
  | 'applied'
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'rejected';

export interface UnifiedJob {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  postedAt: string;
  applyUrl: string | null;         // SerpAPI jobs only
  recruiterName: string | null;    // Internal jobs only
  applicantCount: number;
  status: string;
  matchScore?: number;
}

export interface JobsResponse {
  jobs: UnifiedJob[];
  total: number;
  sources: {
    internal: number;
    external: number;
  };
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId: string | null;
  matchScore: number | null;
  status: ApplicationStatus;
  coverLetter: string | null;
  recruiterNotes: string | null;
  appliedAt: string;
  updatedAt: string;
  // Joined fields
  title?: string;
  company?: string;
  location?: string;
  workMode?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  requiredSkills?: string[];
}

export interface RecruiterJob {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  location: string | null;
  workMode: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  requiredSkills: string[];
  description: string;
  industry: string | null;
  status: 'active' | 'paused' | 'closed';
  applicantCount: number;
  createdAt: string;
  // Pipeline stats (from GROUP BY query)
  totalApplications: number;
  newApplicants: number;
  reviewed: number;
  shortlisted: number;
  inInterview: number;
  offered: number;
  rejected: number;
}

export interface JobFilters {
  search?: string;
  workMode?: string;
  salaryMin?: number;
  skills?: string[];
  page?: number;
  includeExternal?: boolean;
}
