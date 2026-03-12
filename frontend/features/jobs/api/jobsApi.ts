import { apiJson, apiGet, apiForm } from "@/lib/api/client";
import { Job } from "../types/Job";
const jobs = await apiGet('/jobs', { location: 'NYC', title: 'Backend' });
// frontend/features/jobs/api/jobsApi.ts
export function getJobs(): Promise<Job[]> {
  return apiGet<Job[]>("/api/jobs");
}
