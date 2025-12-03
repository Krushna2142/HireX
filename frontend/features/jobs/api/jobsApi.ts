import { apiFetch } from "@/lib/api/client";
import { Job } from "../types/Job";

export function getJobs(): Promise<Job[]> {
  return apiFetch<Job[]>("/api/jobs");
}
