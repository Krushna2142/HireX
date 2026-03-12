export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  postedAt?: string;
  skills?: string[];
}
// frontend/features/jobs/types/Job.ts