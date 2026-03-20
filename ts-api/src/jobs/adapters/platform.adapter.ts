// src/jobs/adapters/platform.adapter.ts
// 
// Abstract base — every job platform implements this interface.
// Adding a new platform = create one class, register in JobsModule.
// Zero changes to sync orchestrator.

export interface PlatformJob {
  externalId:  string;
  title:       string;
  company:     string;
  location:    string;
  description: string;
  workMode:    string;
  empType:     string;
  skills:      string[];
  salaryMin:   number | null;
  salaryMax:   number | null;
  applyUrl:    string | null;
  postedAt:    Date;
  platform:    'serpapi' | 'linkedin' | 'indeed';
}

export abstract class PlatformAdapter {
  abstract readonly name: string;
  abstract fetchJobs(query: string, location: string): Promise<PlatformJob[]>;
}