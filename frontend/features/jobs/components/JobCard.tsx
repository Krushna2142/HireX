import { CalendarDays, MapPin, Building2, ArrowUpRight } from 'lucide-react';
import { Job } from '../types/Job';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { formatRelativeSafe } from '../../../lib/utils/format';

export default function JobCard({ job }: { job: Job }) {
  return (
    <article className="group relative overflow-hidden rounded-xl border bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:shadow-md dark:bg-neutral-900/70 dark:ring-white/10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start gap-4">
        <Avatar name={job.company} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold tracking-tight">{job.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black/70 dark:text-white/70">
            <span className="inline-flex items-center gap-1">
              <Building2 size={16} />
              {job.company}
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={16} />
                {job.location}
              </span>
            )}
            {job.postedAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={16} />
                {formatRelativeSafe(job.postedAt)}
              </span>
            )}
          </div>
          {job.skills?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 6).map(s => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="ml-auto hidden sm:block">
          <Button variant="outline" size="sm" className="gap-1">
            View <ArrowUpRight size={16} />
          </Button>
        </div>
      </div>
    </article>
  );
}