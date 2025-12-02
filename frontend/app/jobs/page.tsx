'use client';
import { useJobs } from '../../features/jobs/hooks/useJobs';
import JobCard from '../../features/jobs/components/JobCard';
import JobSkeleton from '../../features/jobs/components/JobSkeleton';

export default function JobsPage() {
  const { data, isLoading } = useJobs();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Job Feed</h1>
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <JobSkeleton key={i} />
          ))}
        </div>
      )}
      {!isLoading && data && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}