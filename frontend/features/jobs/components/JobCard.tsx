'use client';

export function JobCard({
  title,
  company,
  location,
  tags = [],
}: {
  title: string;
  company: string;
  location: string;
  tags?: string[];
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 shadow-soft transition hover:bg-muted/60">
      <div className="text-base font-semibold text-card-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{company} • {location}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {t}
          </span>
        ))}
      </div>
      <span className="pointer-events-none absolute left-4 right-4 bottom-0 h-[2px] rounded bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </div>
  );
}