'use client';

export function RecommendationCard({
  title,
  score,
  subtitle,
}: {
  title: string;
  score: string;
  subtitle?: string;
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-4 shadow-soft transition hover:bg-muted/60">
      <div className="flex items-start justify-between">
        <div className="text-card-foreground font-semibold">{title}</div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{score}</span>
      </div>
      {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      <span className="pointer-events-none absolute left-4 right-4 bottom-0 h-[2px] rounded bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    </div>
  );
}