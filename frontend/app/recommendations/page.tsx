'use client';
import { Sparkles, Flame, TrendingUp } from 'lucide-react';

export default function RecommendationsPage() {
  const mock = [
    { id: 'r1', title: 'Senior Data Engineer', match: 87, rationale: 'High overlap: Python, ETL' },
    { id: 'r2', title: 'ML Platform Engineer', match: 81, rationale: 'Skills: Kubernetes, Model Ops' },
    { id: 'r3', title: 'Recommendation Systems Engineer', match: 77, rationale: 'Semantic: vector search' }
  ];
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="text-indigo-600 dark:text-indigo-400" /> Recommendations
        </h1>
        <p className="text-sm opacity-70">Personalized roles ranked by skill + semantic fit.</p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mock.map(r => (
          <div
            key={r.id}
            className="group relative rounded-xl border bg-white/70 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur hover:shadow-md dark:bg-neutral-900/70 dark:ring-white/10"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{r.title}</h3>
              <span className="rounded-full bg-indigo-600/15 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                {r.match}%
              </span>
            </div>
            <p className="mt-2 text-xs opacity-70">{r.rationale}</p>
            <div className="absolute inset-x-0 bottom-0 h-[2px] scale-x-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition group-hover:scale-x-100" />
          </div>
        ))}
      </div>
      <section className="rounded-xl border p-6 space-y-2 text-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp size={18} /> How scoring works (placeholder)
        </h2>
        <ul className="list-disc pl-5 space-y-1 opacity-80">
          <li>Skill vector overlap (hard + soft)</li>
          <li>Semantic transformer similarity</li>
          <li>Recent activity weighting</li>
          <li>Resume gap penalty</li>
        </ul>
      </section>
      <section className="rounded-xl border p-6 space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Flame size={18} /> Improve Your Match
        </h2>
        <p className="text-sm opacity-70">
          Upload your resume and fill missing skill tags to boost recommendation accuracy.
        </p>
      </section>
    </div>
  );
}