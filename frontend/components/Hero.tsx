'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-0.5 pb-0.5">
      <div
        className="pointer-events-none absolute  inset-0 -z-10 opacity-60 blur-3xl"
        aria-hidden
        style={{
          background:
            'radial-gradient(600px 300px at 20% 10%, rgba(99,102,241,0.25), transparent), radial-gradient(600px 300px at 80% 0%, rgba(236,72,153,0.25), transparent)',
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wider text-muted-foreground">
            Introducing the next era of job search
          </span>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
            Find your next role with
            <span className="ml-2 bg-linear-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              JobCrawler
            </span>
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Aggregate, filter, and track openings from across the web. Smart search, AI summaries,
            and one place to manage your applications.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/jobs"
              className="rounded-md bg-foreground px-5 py-2.5 text-sm text-background shadow-sm transition hover:bg-foreground/90"
            >
              Browse jobs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-border px-5 py-2.5 text-sm transition hover:bg-muted"
            >
              Go to dashboard
            </Link>
          </div>
          <div className="pt-4 text-sm text-muted-foreground">10k+ roles indexed. Updated hourly.</div>
        </div>

        <div className="grid content-start gap-4 sm:grid-cols-2">
          <GlassCard title="Smart filters" desc="Company, salary, seniority, tech stack." />
          <GlassCard title="AI summaries" desc="Digest job descriptions instantly." />
          <GlassCard title="Tracker" desc="Save, stage, and follow up." />
          <GlassCard title="Alerts" desc="New matches in your inbox." />
        </div>
      </div>
    </section>
  );
}

function GlassCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
      <div className="text-sm font-medium text-card-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}